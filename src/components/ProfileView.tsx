import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { UserProfile } from '../types';
import { doc, updateDoc, serverTimestamp, getDoc, deleteDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { User, Camera, Calendar, Save, CheckCircle, ArrowLeft, Trash2, Home, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';
import { compressImage } from '../lib/imageUtils';

import { handleFirestoreError, OperationType } from '../lib/utils';

export default function ProfileView({ onBack }: { onBack?: () => void }) {
  const { profile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [birthday, setBirthday] = useState(profile?.birthday || '');
  const [familyName, setFamilyName] = useState('');
  const [isFamilyLoading, setIsFamilyLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isTransferringHead, setIsTransferringHead] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [transferTarget, setTransferTarget] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
      setBirthday(profile.birthday || '');
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.familyId) {
      const fetchData = async () => {
        try {
          // Fetch family name
          const familyDoc = await getDoc(doc(db, 'families', profile.familyId));
          if (familyDoc.exists()) {
            const familyData = familyDoc.data();
            setFamilyName(familyData.name);
          }

          // Fetch members for transfer list (only if head)
          if (profile.isHead) {
            const q = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
            const snap = await getDocs(q);
            setMembers(snap.docs.map(d => d.data() as UserProfile).filter(m => m.uid !== profile.uid));
          }
        } catch (err) {
          console.error("Error fetching settings data:", err);
        } finally {
          setIsFamilyLoading(false);
        }
      };
      fetchData();
    }
  }, [profile?.familyId, profile?.isHead, profile?.uid]);

  const handleTransferHead = async () => {
    if (!transferTarget || !profile) return;
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      const familyRef = doc(db, 'families', profile.familyId);
      const oldHeadRef = doc(db, 'users', profile.uid);
      const newHeadRef = doc(db, 'users', transferTarget.uid);

      // 1. Update family document headId
      batch.update(familyRef, {
        headId: transferTarget.uid,
        updatedAt: serverTimestamp()
      });

      // 2. Update new head's user profile
      batch.update(newHeadRef, {
        isHead: true,
        updatedAt: serverTimestamp()
      });

      // 3. Update old head's user profile
      batch.update(oldHeadRef, {
        isHead: false,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      setIsTransferringHead(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `families/${profile.familyId}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const storagePath = `users/${profile.uid}/profile_${Date.now()}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      
      // Save to Firestore immediately for better UX
      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: url,
        updatedAt: serverTimestamp()
      });
      
      setPhotoURL(url);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Upload error:", err);
      // More specific error handling for user feedback
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg.includes("insufficient permissions")) {
        alert("Permission denied. Please check if you are logged in correctly.");
      } else {
        alert("Failed to upload image. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Update User Profile
      const updateData: any = {
        displayName: displayName.trim(),
        birthday: birthday || null,
        updatedAt: serverTimestamp()
      };
      
      // Only include photoURL if we haven't just uploaded it (optional, but clean)
      if (photoURL) {
        updateData.photoURL = photoURL.trim();
      }

      await updateDoc(doc(db, 'users', profile.uid), updateData);

      // Update Family Data IF Head
      if (profile.isHead) {
        await updateDoc(doc(db, 'families', profile.familyId), {
          name: familyName.trim(),
          updatedAt: serverTimestamp()
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    try {
      // If head, clear the headId in family document before deleting
      if (profile.isHead) {
        await updateDoc(doc(db, 'families', profile.familyId), {
          headId: null,
          updatedAt: serverTimestamp()
        });
      }
      
      await deleteDoc(doc(db, 'users', profile.uid));
      localStorage.clear();
      logout();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${profile.uid}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 md:px-6 pt-8 md:pt-12 pb-32">
      <header className="mb-8 md:mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight mb-2">Settings</h1>
          <p className="text-sm md:text-base text-slate-500">Manage your profile and family hub.</p>
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2.5 md:p-3 bg-white rounded-xl md:rounded-2xl shadow-soft border border-slate-100 text-slate-400 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
        )}
      </header>

      <form onSubmit={handleSave} className="space-y-6 md:space-y-8 max-w-lg">
        <div className="flex flex-col items-center mb-6 md:mb-8">
          <div className="relative group">
            <div className={`w-28 h-28 md:w-36 md:h-36 rounded-[40px] md:rounded-[48px] overflow-hidden bg-slate-100 shadow-premium relative ${profile?.isHead ? 'head-border ring-offset-4' : 'border-4 border-white'}`}>
              {photoURL ? (
                <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User size={56} />
                </div>
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 bg-[#1a1a1a] text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border-4 border-[#fcfcf9]"
            >
              <Camera size={20} />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tap to change photo</p>
        </div>

        <div className="space-y-5 md:space-y-6">
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-slate-700 ml-1">Display Name</label>
            <input
              type="text"
              value={displayName || ''}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-12 md:h-14 px-4 md:px-6 bg-white border border-slate-200 rounded-[18px] md:rounded-2xl shadow-soft focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm md:text-base"
              placeholder="e.g. Dad, Sarah, Grandpa"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-slate-700 ml-1">Photo URL (Link)</label>
            <div className="relative">
              <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
                <Upload size={18} />
              </div>
              <input
                type="url"
                value={photoURL || ''}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-4 md:px-6 bg-white border border-slate-200 rounded-[18px] md:rounded-2xl shadow-soft focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm md:text-base"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 ml-1 mt-1">Paste a link to use a profile picture from the web.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-slate-700 ml-1">Birthday</label>
            <div className="relative">
              <Calendar className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={birthday || ''}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-4 md:px-6 bg-white border border-slate-200 rounded-[18px] md:rounded-2xl shadow-soft focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm md:text-base"
              />
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 ml-1 mt-1">So your family can celebrate with you!</p>
          </div>

          {/* Family Control Section (Only for Head) */}
          {profile?.isHead && (
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-5 md:space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Home size={16} className="text-indigo-500" />
                <h3 className="text-xs md:text-sm font-bold text-slate-700">Family Hub Control</h3>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Family Hub Name</label>
                <input
                  type="text"
                  value={familyName || ''}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full h-12 md:h-14 px-4 md:px-6 bg-indigo-50/30 border border-indigo-100 rounded-[18px] md:rounded-2xl shadow-soft focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-indigo-900 text-sm md:text-base"
                  placeholder="The Smiths Hub"
                  disabled={isFamilyLoading}
                />
              </div>

              {members.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Transfer Headship</label>
                  <button
                    type="button"
                    onClick={() => setIsTransferringHead(true)}
                    className="w-full h-12 md:h-14 px-4 md:px-6 bg-white border border-slate-200 rounded-[18px] md:rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all"
                  >
                    <span className="text-xs md:text-sm font-bold text-slate-600">Choose successor...</span>
                    <ArrowLeft size={16} className="text-slate-300 group-hover:text-indigo-400 rotate-180" />
                  </button>
                  <p className="text-[9px] md:text-[10px] text-slate-400 ml-1 leading-relaxed">
                    Transferring headship grants another member control over the Family Hub name and Vault security.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full h-14 md:h-16 bg-[#1a1a1a] text-white rounded-2xl md:rounded-3xl font-semibold flex items-center justify-center gap-3 shadow-premium hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : saveSuccess ? (
            <>
              <CheckCircle size={24} />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save size={24} />
              <span>Save Changes</span>
            </>
          )}
        </button>

        <div className="pt-8 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsDeletingAccount(true)}
            className="w-full h-14 bg-white border-2 border-red-50 text-red-500 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-95"
          >
            <Trash2 size={16} />
            <span>Delete Account</span>
          </button>
        </div>

        <div className="pt-6 italic text-slate-400 text-sm text-center">
          Family ID: <span className="font-mono text-slate-600">{profile?.familyId}</span>
        </div>
      </form>

      <ConfirmDialog
        isOpen={isTransferringHead}
        title="Transfer Headship?"
        message="Select the family member who will become the new Head of Family."
        confirmLabel="Confirm Transfer"
        cancelLabel="Nevermind"
        onConfirm={handleTransferHead}
        onCancel={() => {
          setIsTransferringHead(false);
          setTransferTarget(null);
        }}
      >
        <div className="mt-4 grid grid-cols-1 gap-2">
          {members.map(member => (
            <button
              key={member.uid}
              onClick={() => setTransferTarget(member)}
              className={`p-4 rounded-xl border text-left transition-all ${
                transferTarget?.uid === member.uid 
                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                : 'bg-white border-slate-100 hover:border-slate-300'
              }`}
            >
              <p className="font-bold text-[#1a1a1a]">{member.displayName}</p>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{member.email}</p>
            </button>
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={isDeletingAccount}
        title="Delete Account?"
        message={profile?.isHead 
          ? "You are the Head of Family. Deleting your account will leave the family without a head until someone else takes the title. This cannot be undone."
          : "Are you sure you want to delete your account? All your personal data will be removed. This cannot be undone."}
        confirmLabel="Destroy My Profile"
        cancelLabel="Keep My Profile"
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeletingAccount(false)}
      />
    </div>
  );
}
