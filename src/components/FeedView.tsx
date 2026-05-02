import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Post } from '../types';
import { Send, Image as ImageIcon, User as UserIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';

export default function FeedView() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.familyId) return;

    const postsRef = collection(db, 'families', profile.familyId, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.familyId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !profile?.familyId) return;

    try {
      await addDoc(collection(db, 'families', profile.familyId, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        content: newPost,
        timestamp: serverTimestamp()
      });
      setNewPost('');
    } catch (err) {
      console.error('Error posting:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete || !profile?.familyId) return;

    try {
      await deleteDoc(doc(db, 'families', profile.familyId, 'posts', postToDelete));
      setPostToDelete(null);
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-8 pb-4 flex justify-between items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Our Family</p>
          <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a]">Wall</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <UserIcon size={20} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-40">
        <AnimatePresence initial={false}>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[32px] shadow-soft border border-slate-50 transition-all hover:shadow-premium group"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center text-white font-bold text-sm uppercase">
                    {post.authorName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-[#1a1a1a] text-lg leading-none mb-1">{post.authorName}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-none">
                      {post.timestamp ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                </div>

                {post.authorId === profile?.uid && (
                  <button
                    id={`delete-post-${post.id}`}
                    onClick={() => setPostToDelete(post.id)}
                    className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <p className="text-2xl text-[#1a1a1a] font-medium leading-[1.4] whitespace-pre-wrap">{post.content}</p>
              {post.imageUrl && (
                <div className="mt-6 rounded-[24px] overflow-hidden shadow-soft">
                  <img src={post.imageUrl} alt="Shared" className="w-full object-cover max-h-[400px]" referrerPolicy="no-referrer" />
                </div>
              )}
            </motion.div>
          ))}
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

      <div className="fixed bottom-32 left-6 right-6 flex justify-center pointer-events-none">
        <form 
          onSubmit={handlePost}
          className="w-full max-w-xl glass rounded-[28px] p-2 shadow-premium flex items-center gap-2 pointer-events-auto ring-1 ring-black/5"
        >
          <input
            id="post-input"
            type="text"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share it with everyone..."
            className="flex-1 bg-transparent px-6 py-4 text-lg outline-none text-[#1a1a1a] placeholder:text-slate-300 font-medium"
          />
          <button
            id="send-post-btn"
            type="submit"
            className="bg-[#1a1a1a] text-white p-4 rounded-[22px] hover:bg-slate-800 transition-colors disabled:opacity-20"
            disabled={!newPost.trim()}
          >
            <Send size={24} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={!!postToDelete}
        title="Delete memory?"
        message="This post will be removed from the family wall forever."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        onConfirm={handleDeletePost}
        onCancel={() => setPostToDelete(null)}
      />
    </div>
  );
}
