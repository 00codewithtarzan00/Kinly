import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { generateFamilyCode, handleFirestoreError, OperationType } from '../lib/utils';
import { LogOut, Users, PlusCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OnboardingView() {
  const { profile, user, logout } = useAuth();
  const [code, setCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [userName, setUserName] = useState(profile?.displayName || '');
  const [mode, setMode] = useState<'selection' | 'join' | 'create'>('selection');
  const [error, setError] = useState<string | null>(null);

  const saveLocal = (fId: string) => {
    localStorage.setItem('familyId', fId);
    // The profile listener in AuthProvider will pick up the change and Layout will react
  };

  const handleJoin = async () => {
    const cleanCode = code.replace(/\s+/g, '');
    if (cleanCode.length !== 6) {
      setError('Code must be 6 digits.');
      return;
    }
    if (!userName.trim()) {
      setError('Please enter your name.');
      return;
    }

    try {
      const familyDoc = await getDoc(doc(db, 'families', cleanCode));
      if (!familyDoc.exists()) {
        setError('Family code not found.');
        return;
      }

      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            familyId: cleanCode,
            displayName: userName,
            isHead: false, 
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          setError('Could not join family. Please try again.');
          console.error(err);
          return;
        }
      }
      saveLocal(cleanCode);
    } catch (err) {
      setError('Could not join family. Please check the code.');
    }
  };

  const handleCreate = async () => {
    if (!familyName.trim()) {
      setError('Please enter a family name.');
      return;
    }
    if (!userName.trim()) {
      setError('Please enter your name.');
      return;
    }

    const newCode = generateFamilyCode();
    try {
      try {
        await setDoc(doc(db, 'families', newCode), {
          familyId: newCode,
          name: familyName,
          headId: user?.uid || null, // Creator is the head
          createdAt: serverTimestamp()
        });
      } catch (err) {
        await handleFirestoreError(err, OperationType.WRITE, `families/${newCode}`);
      }

      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            familyId: newCode,
            displayName: userName,
            isHead: true, 
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          setError('Family created, but failed to link your profile. Try reloading.');
          console.error(err);
          return;
        }
      }
      saveLocal(newCode);
    } catch (err) {
      console.error(err);
      setError('Could not create family.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcf9] flex flex-col items-center justify-center p-6 md:p-8 font-sans">
      <div className="w-full max-w-md">
        <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center mb-10 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-[#1a1a1a] mb-4">Set up your Hub</h1>
          <p className="text-base md:text-lg text-slate-500 font-medium">Choose how you want to connect.</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'selection' && (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <button
                id="join-family-btn"
                onClick={() => setMode('join')}
                className="w-full p-6 md:p-8 bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] shadow-soft flex flex-col items-center gap-3 md:gap-4 hover:shadow-premium hover:border-[#1a1a1a]/10 transition-all group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <Users size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl md:text-2xl font-black text-[#1a1a1a]">Join a Family</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-widest">Use a 6-digit code</p>
                </div>
              </button>

              <button
                id="create-family-btn"
                onClick={() => setMode('create')}
                className="w-full p-6 md:p-8 bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] shadow-soft flex flex-col items-center gap-3 md:gap-4 hover:shadow-premium hover:border-[#1a1a1a]/10 transition-all group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <PlusCircle size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl md:text-2xl font-black text-[#1a1a1a]">Start Fresh</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-widest">Create a new group</p>
                </div>
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div 
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <label className="block text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-2 md:mb-4">Your Name</label>
                  <input
                    id="user-name-input"
                    type="text"
                    value={userName || ''}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="E.g. Dadi"
                    className="w-full bg-transparent text-2xl md:text-3xl text-center font-black tracking-tight text-[#1a1a1a] outline-none placeholder:text-slate-100 py-2 border-b-2 border-slate-50 focus:border-[#1a1a1a] transition-all"
                  />
                </div>

                <div className="text-center">
                  <label className="block text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-2 md:mb-4">Family Code</label>
                  <input
                    id="family-code-input"
                    type="text"
                    maxLength={6}
                    value={code || ''}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="000 000"
                    className="w-full bg-transparent text-4xl md:text-5xl text-center font-black tracking-tighter text-[#1a1a1a] outline-none placeholder:text-slate-100 py-4 border-b-4 border-slate-50 focus:border-[#1a1a1a] transition-all font-mono"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 font-black text-center text-xs uppercase tracking-wider">{error}</p>}
              <button
                id="confirm-join-btn"
                onClick={handleJoin}
                className="w-full h-16 md:h-20 bg-[#1a1a1a] text-white rounded-[20px] md:rounded-[24px] text-xl md:text-2xl font-black shadow-premium hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-20"
                disabled={code.length !== 6 || !userName.trim()}
              >
                Connect
              </button>
              <button onClick={() => setMode('selection')} className="w-full text-slate-400 font-bold text-base md:text-lg hover:text-[#1a1a1a] transition-colors">Go Back</button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div 
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <label className="block text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-2 md:mb-4">Your Name</label>
                  <input
                    id="user-name-input"
                    type="text"
                    value={userName || ''}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="E.g. Dada"
                    className="w-full bg-transparent text-2xl md:text-3xl text-center font-black tracking-tight text-[#1a1a1a] outline-none placeholder:text-slate-100 py-2 border-b-2 border-slate-50 focus:border-[#1a1a1a] transition-all"
                  />
                </div>

                <div className="text-center">
                  <label className="block text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-2 md:mb-4">Family Hub Name</label>
                  <input
                    id="family-name-input"
                    type="text"
                    value={familyName || ''}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="The Smiths"
                    className="w-full bg-transparent text-3xl md:text-4xl text-center font-black tracking-tighter text-[#1a1a1a] outline-none placeholder:text-slate-100 py-4 border-b-4 border-slate-50 focus:border-[#1a1a1a] transition-all"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 font-black text-center text-xs uppercase tracking-wider">{error}</p>}
              <button
                id="confirm-create-btn"
                onClick={handleCreate}
                className="w-full h-16 md:h-20 bg-[#1a1a1a] text-white rounded-[20px] md:rounded-[24px] text-xl md:text-2xl font-black shadow-premium hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-20"
                disabled={!familyName.trim() || !userName.trim()}
              >
                Establish Hub
              </button>
              <button onClick={() => setMode('selection')} className="w-full text-slate-400 font-bold text-base md:text-lg hover:text-[#1a1a1a] transition-colors">Go Back</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 flex justify-center">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-300 hover:text-red-500 transition-colors font-black text-xs uppercase tracking-widest"
          >
            <LogOut size={16} />
            <span>Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
