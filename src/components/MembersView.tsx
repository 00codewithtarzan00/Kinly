import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { UserProfile } from '../types';
import { User, Shield, UserMinus, Edit2, Check, X, ShieldAlert, Calendar, Info, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';
import { format, parseISO } from 'date-fns';

import { handleFirestoreError, OperationType } from '../lib/utils';

interface AliasMap {
  [uid: string]: string;
}

export default function MembersView() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [aliases, setAliases] = useState<AliasMap>({});
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.familyId) return;

    // Fetch members
    const membersQuery = query(
      collection(db, 'users'),
      where('familyId', '==', profile.familyId)
    );

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        ...doc.data()
      } as UserProfile));
      setMembers(membersData);
      setLoading(false);
    }, (error) => {
      if (error.message.includes('permissions')) {
        console.warn('Establishing Members connection...');
      } else {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    // Fetch personal aliases
    const aliasesPath = `users/${profile.uid}/memberAliases`;
    const aliasesRef = collection(db, aliasesPath);
    const unsubAliases = onSnapshot(aliasesRef, (snapshot) => {
      const aliasData: AliasMap = {};
      snapshot.docs.forEach(doc => {
        aliasData[doc.id] = doc.data().alias;
      });
      setAliases(aliasData);
    }, (error) => {
      if (!error.message.includes('permissions')) {
        handleFirestoreError(error, OperationType.GET, aliasesPath);
      }
    });

    return () => {
      unsubMembers();
      unsubAliases();
    };
  }, [profile?.familyId, profile?.uid]);

  const removeMember = async () => {
    if (!memberToRemove || !profile?.isHead) return;

    try {
      const userDocRef = doc(db, 'users', memberToRemove.uid);
      await updateDoc(userDocRef, {
        familyId: null
      });
      setMemberToRemove(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${memberToRemove.uid}`);
    }
  };

  const saveAlias = async (targetUid: string) => {
    if (!profile) return;
    try {
      const path = `users/${profile.uid}/memberAliases/${targetUid}`;
      const aliasRef = doc(db, path);
      if (newAlias.trim()) {
        await setDoc(aliasRef, { alias: newAlias.trim() });
      } else {
        await deleteDoc(aliasRef);
      }
      setEditingAlias(null);
      setNewAlias('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}/memberAliases/${targetUid}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-8 pb-4 flex justify-between items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Our Circle</p>
          <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a]">Family</h1>
        </div>
        {profile?.isHead && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full border border-amber-100">
            <Shield size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Family Head</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-4 pb-32">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <motion.div
                key={member.uid}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedMember(member)}
                className={`bg-white p-6 rounded-[32px] shadow-soft border border-slate-100 flex items-center gap-4 group transition-all cursor-pointer hover:shadow-premium ${
                  member.uid === profile?.uid ? 'ring-2 ring-indigo-50' : ''
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden relative border-2 ${member.isHead ? 'head-border ring-offset-0 scale-90' : 'bg-slate-50 border-slate-100'}`}>
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-bold text-[#1a1a1a] text-lg">
                    {aliases[member.uid] || member.displayName}
                  </p>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-300">
                    {member.uid === profile?.uid ? 'You' : member.isHead ? 'Family Head' : 'Family Member'}
                  </p>
                </div>

                <div className="p-2 text-slate-200">
                  <Info size={20} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm p-6 flex flex-col justify-end pointer-events-auto"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white rounded-[40px] p-8 pb-12 shadow-2xl space-y-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center">
                <div className={`w-24 h-24 rounded-[32px] overflow-hidden shadow-premium bg-slate-100 border-4 border-white ${selectedMember.isHead ? 'head-border ring-offset-4' : ''}`}>
                  {selectedMember.photoURL ? (
                    <img src={selectedMember.photoURL} alt={selectedMember.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <User size={40} />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-3xl font-black text-[#1a1a1a] tracking-tight mb-1">
                  {aliases[selectedMember.uid] || selectedMember.displayName}
                </h2>
                {aliases[selectedMember.uid] && (
                  <p className="text-sm font-bold text-slate-400">({selectedMember.displayName})</p>
                )}
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[28px]">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Birthday</p>
                    <p className="font-bold text-slate-700">
                      {selectedMember.birthday ? format(parseISO(selectedMember.birthday), 'MMMM d, yyyy') : 'No birthday set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                {editingAlias === selectedMember.uid ? (
                  <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-[24px]">
                    <input
                      type="text"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      placeholder="Add nickname..."
                      className="flex-1 bg-transparent px-4 py-2 text-sm font-bold outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveAlias(selectedMember.uid)}
                    />
                    <button onClick={() => saveAlias(selectedMember.uid)} className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingAlias(null)} className="w-10 h-10 bg-slate-300 text-white rounded-full flex items-center justify-center">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingAlias(selectedMember.uid);
                      setNewAlias(aliases[selectedMember.uid] || '');
                    }}
                    className="w-full h-14 bg-white border-2 border-slate-100 rounded-[24px] text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    <Edit2 size={16} />
                    <span>{aliases[selectedMember.uid] ? 'Change Alias' : 'Set Alias'}</span>
                  </button>
                )}
              </div>

              {profile?.isHead && selectedMember.uid !== profile?.uid && !editingAlias && (
                <button
                  onClick={() => setMemberToRemove(selectedMember)}
                  className="w-full h-14 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-[20px] transition-colors"
                >
                  Remove from family
                </button>
              )}

              <button 
                onClick={() => setSelectedMember(null)}
                className="w-full text-slate-400 font-black text-xs uppercase tracking-widest pt-4"
              >
                Close Profile
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!memberToRemove}
        title="Remove Member?"
        message={`Are you sure you want to remove ${memberToRemove?.displayName} from the family? This cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={() => {
          removeMember();
          setSelectedMember(null);
        }}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
