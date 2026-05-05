import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Post, UserProfile } from '../types';
import { Send, Image as ImageIcon, User as UserIcon, Trash2, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';
import { compressImage } from '../lib/imageUtils';
import { useMemberAliases } from '../hooks/useMemberAliases';

import { handleFirestoreError, OperationType } from '../lib/utils';

export default function FeedView({ onProfileClick, onNavVisibilityChange }: { onProfileClick?: () => void, onNavVisibilityChange?: (visible: boolean) => void }) {
  const { profile, logout } = useAuth();
  const { getAlias } = useMemberAliases();
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [familyName, setFamilyName] = useState<string>('Our Hub');
  const [newPost, setNewPost] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [recipient, setRecipient] = useState<string | 'everyone'>('everyone');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [posts]);

  useEffect(() => {
    onNavVisibilityChange?.(!isComposerOpen);
  }, [isComposerOpen, onNavVisibilityChange]);

  useEffect(() => {
    if (!profile?.familyId) return;

    // Fetch members for composer
    const membersQ = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
    const unsubMembers = onSnapshot(membersQ, (snap) => {
      setMembers(snap.docs.map(doc => doc.data() as UserProfile).filter(m => m.uid !== profile?.uid));
    }, (error) => {
      console.warn('FeedView member sync delay:', error);
    });

    // Fetch Family Name
    const familyRef = doc(db, 'families', profile.familyId);
    const unsubFamily = onSnapshot(familyRef, (snapshot) => {
      if (snapshot.exists()) {
        setFamilyName(snapshot.data().name);
      }
    }, (error) => {
      console.warn('Family fetch delay (establishing hub...):', error);
      // If it's a permission error, it might be a sync delay, we'll let it stay loading
    });

    const postsPath = `families/${profile.familyId}/posts`;
    const postsRef = collection(db, postsPath);
    const q = query(postsRef, orderBy('timestamp', 'asc'));

    const unsubPosts = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      if (error.message.includes('permissions')) {
        console.warn('Establishing Hub connection...');
        // We don't call handleFirestoreError here immediately 
        // to give the system time to sync profiles.
        // Apps often hit this 1-2s race condition on first join.
      } else {
        handleFirestoreError(error, OperationType.GET, postsPath);
      }
    });

    return () => {
      unsubPosts();
      unsubFamily();
      unsubMembers();
    };
  }, [profile?.familyId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    
    const previewUrl = URL.createObjectURL(file);
    setPendingPreviewUrl(previewUrl);
    setPendingFile(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImageUpload = async () => {
    if (!pendingFile || !profile?.familyId) return;

    setIsUploading(true);
    const fileToProcess = pendingFile;
    setPendingFile(null);
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(null);
    }

    try {
      // 1. Compress
      const compressed = await compressImage(fileToProcess);
      
      // 2. Upload to Firebase Storage
      const storagePath = `families/${profile.familyId}/posts/${Date.now()}_${fileToProcess.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, compressed);
      
      // 3. Get URL
      const downloadURL = await getDownloadURL(storageRef);
      setSelectedImage(downloadURL);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Could not upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !selectedImage) || !profile?.familyId) return;

    try {
      const postsPath = `families/${profile.familyId}/posts`;
      
      let finalContent = newPost;
      if (recipient !== 'everyone') {
        const targetMember = members.find(m => m.uid === recipient);
        const targetName = getAlias(recipient, targetMember?.displayName || 'Someone');
        finalContent = `[To ${targetName}]: ${newPost}`;
      }

      await addDoc(collection(db, postsPath), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorIsHead: !!profile.isHead,
        content: finalContent,
        imageUrl: selectedImage,
        recipientId: recipient === 'everyone' ? null : recipient,
        timestamp: serverTimestamp()
      });
      setNewPost('');
      setSelectedImage(null);
      setIsComposerOpen(false);
      setRecipient('everyone');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `families/${profile.familyId}/posts`);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete || !profile?.familyId) return;

    try {
      const postPath = `families/${profile.familyId}/posts/${postToDelete}`;
      await deleteDoc(doc(db, postPath));
      setPostToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `families/${profile.familyId}/posts/${postToDelete}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-6 md:p-8 pb-4 flex justify-between items-start sticky top-0 bg-[#fcfcf9] z-40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={onProfileClick}
              className={`w-12 h-12 md:w-16 md:h-16 rounded-[18px] md:rounded-[24px] overflow-hidden bg-slate-100 shadow-premium transition-all active:scale-95 group relative flex-shrink-0 ${profile?.isHead ? 'head-border ring-offset-0 scale-90 md:scale-100' : 'border-2 border-white'}`}
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-indigo-50">
                  <UserIcon size={20} />
                </div>
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 mb-0.5">
                <p className="hidden xs:block text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hello,</p>
                <span className="text-[9px] md:text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black tracking-widest border border-indigo-100 uppercase truncate max-w-[80px] md:max-w-none">
                  {profile?.displayName}
                </span>
              </div>
              <h1 className="text-xl md:text-3xl font-black tracking-tighter text-[#1a1a1a] leading-none truncate md:max-w-[200px]">{familyName}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 ml-2">
          <div className="hidden xs:flex flex-col items-end mr-1">
             <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Code</span>
             <span className="text-sm md:text-xl font-black tracking-tighter text-[#1a1a1a] font-mono whitespace-nowrap">#{profile?.familyId}</span>
          </div>

          <button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-red-500 hover:border-red-100 transition-all shadow-soft active:scale-95 group"
            title="Log Out"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-6 py-6 pb-40 relative flex flex-col gap-4 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {posts.filter(p => !p.recipientId || p.recipientId === profile?.uid || p.authorId === profile?.uid).map((post) => {
            const isMe = post.authorId === profile?.uid;
            const isSecret = !!post.recipientId;

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${isMe ? 'opacity-0 h-0' : 'ml-3 text-slate-400'}`}>
                  {!isMe && <div className={`w-1 h-1 rounded-full ${post.authorIsHead ? 'bg-amber-400' : 'bg-slate-300'}`} />}
                  {getAlias(post.authorId, post.authorName)}
                </span>

                <div className={`group relative max-w-[85%] md:max-w-[75%] ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                  <div className={`p-4 md:p-5 rounded-[24px] shadow-soft border relative ${
                    isSecret 
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-premium' 
                    : (isMe 
                        ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none shadow-md' 
                        : 'bg-white text-[#1a1a1a] border-slate-100 rounded-tl-none')
                  }`}>
                    {isSecret && (
                      <div className="flex items-center gap-1.5 mb-2 opacity-50">
                        <X size={10} className="rotate-45" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Secret Note</span>
                      </div>
                    )}
                    
                    <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    
                    {post.imageUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
                        <img src={post.imageUrl} alt="Shared" className="w-full object-cover max-h-[350px]" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-2 mt-1.5 px-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                      {post.timestamp ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                    </p>
                    
                    {(post.authorId === profile?.uid || profile?.isHead) && (
                      <button
                        onClick={() => setPostToDelete(post.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 text-slate-200 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-[#1a1a1a] border-t-transparent"></div>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon size={48} className="text-slate-200" />
            </div>
            <p className="text-2xl font-bold text-slate-300 tracking-tight">Your family wall is waiting.</p>
          </div>
        )}
      </div>

      {/* Post FAB */}
      {!isComposerOpen && (
        <div className="fixed bottom-32 right-6 md:right-8 z-40">
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsComposerOpen(true)}
            className="w-16 h-16 bg-[#1a1a1a] text-white rounded-full flex items-center justify-center shadow-premium ring-4 ring-[#fcfcf9]"
          >
            <Send size={28} />
          </motion.button>
        </div>
      )}

      {/* Composer Modal */}
      <AnimatePresence>
        {isComposerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col p-6"
          >
            <header className="flex justify-between items-center mb-8">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase tracking-[0.2em]">New Thread</h2>
              <button 
                onClick={() => setIsComposerOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </header>

            <form onSubmit={handlePost} className="flex-1 flex flex-col overflow-hidden max-w-2xl mx-auto w-full">
              <div className="mb-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Send to:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipient('everyone')}
                    className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                      recipient === 'everyone' ? 'bg-white text-[#1a1a1a]' : 'bg-white/10 text-white'
                    }`}
                  >
                    Everyone
                  </button>
                  {members.map(m => (
                    <button
                      key={m.uid}
                      type="button"
                      onClick={() => setRecipient(m.uid)}
                      className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                        recipient === m.uid ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white border border-transparent'
                      }`}
                    >
                      {getAlias(m.uid, m.displayName)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 relative flex flex-col min-h-0">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder={recipient === 'everyone' ? "What's the word with the fam?" : `Note for ${getAlias(recipient, members.find(m => m.uid === recipient)?.displayName || 'someone')}...`}
                  className="flex-1 bg-transparent text-white text-2xl md:text-3xl font-bold placeholder:text-white/20 outline-none resize-none no-scrollbar py-4"
                  autoFocus
                />
                
                <AnimatePresence>
                  {selectedImage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative w-full aspect-video mb-8 rounded-[32px] overflow-hidden group"
                    >
                      <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md"
                      >
                        <X size={24} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="py-8 flex items-center justify-between gap-4">
                <div className="flex gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 md:w-16 md:h-16 bg-white/10 text-white flex items-center justify-center rounded-[20px] md:rounded-[24px] transition-all hover:bg-white/20"
                  >
                    {isUploading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImageIcon size={24} />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={(!newPost.trim() && !selectedImage) || isUploading}
                  className="bg-white text-[#1a1a1a] h-14 md:h-16 px-8 md:px-10 rounded-[20px] md:rounded-[24px] font-black uppercase tracking-widest text-xs md:text-sm flex items-center gap-3 disabled:opacity-50 transition-all active:scale-95 shadow-premium"
                >
                  <Send size={20} />
                  <span>Send Thread</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>


      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Log Out?"
        message="Are you sure you want to log out? You will need to sign in again to access your family wall."
        confirmLabel="Log Out"
        cancelLabel="Stay"
        onConfirm={logout}
        onCancel={() => setIsLogoutDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!postToDelete}
        title="Delete memory?"
        message="This post will be removed from the family wall forever."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        onConfirm={handleDeletePost}
        onCancel={() => setPostToDelete(null)}
      />

      <ConfirmDialog
        isOpen={!!pendingFile}
        title="Add this photo?"
        message="Would you like to attach this image to your post?"
        confirmLabel="Add Photo"
        cancelLabel="Cancel"
        type="info"
        onConfirm={confirmImageUpload}
        onCancel={() => {
          setPendingFile(null);
          if (pendingPreviewUrl) {
            URL.revokeObjectURL(pendingPreviewUrl);
            setPendingPreviewUrl(null);
          }
        }}
      >
        {pendingPreviewUrl && (
          <div className="rounded-[24px] overflow-hidden shadow-soft border border-slate-100">
            <img src={pendingPreviewUrl} alt="Preview" className="w-full h-auto max-h-[300px] object-cover" />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
