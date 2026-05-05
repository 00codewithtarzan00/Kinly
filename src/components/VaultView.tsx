import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { VaultItem } from '../types';
import { Lock, Eye, EyeOff, Plus, Trash2, Key, Unlock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';
import { handleFirestoreError, OperationType } from '../lib/utils';

export default function VaultView() {
  const { profile } = useAuth();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [newItem, setNewItem] = useState({ title: '', value: '' });
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  useEffect(() => {
    if (!profile?.familyId) return;

    // Check for vault password
    const fetchFamilySecurity = async () => {
      try {
        const familyDoc = await getDoc(doc(db, 'families', profile.familyId));
        if (familyDoc.exists()) {
          const data = familyDoc.data();
          setVaultPassword(data.vaultPassword || null);
          // If no password, it's "unlocked" for now, unless we want to force setup
          if (!data.vaultPassword) {
            setIsUnlocked(true);
          }
        }
      } catch (err) {
        console.error("Error checking vault security:", err);
      }
    };

    fetchFamilySecurity();

    const vaultRef = collection(db, 'families', profile.familyId, 'vault');
    const q = query(vaultRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VaultItem[];
      setItems(itemsData);
      setLoading(false);
    }, (error) => {
      if (error.message.includes('permissions')) {
        console.warn('Establishing Vault connection...');
      } else {
        console.error('Vault error:', error);
      }
    });

    return () => unsubscribe();
  }, [profile?.familyId]);

  const handleUnlock = (pin: string) => {
    if (pin === vaultPassword) {
      setIsUnlocked(true);
      setError(null);
      setPasswordInput('');
    } else {
      setError('Incorrect PIN');
      setPasswordInput('');
    }
  };

  const handleSetPassword = async (pin: string) => {
    if (pin.length < 4 || !profile?.familyId) return;

    try {
      await setDoc(doc(db, 'families', profile.familyId), {
        vaultPassword: pin,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setVaultPassword(pin);
      setIsUnlocked(true);
      setIsSettingPassword(false);
      setPasswordInput('');
      setNewPasswordInput('');
    } catch (err) {
      await handleFirestoreError(err, OperationType.WRITE, `families/${profile.familyId}`);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim() || !newItem.value.trim() || !profile?.familyId) return;

    try {
      await addDoc(collection(db, 'families', profile.familyId, 'vault'), {
        ...newItem,
        updatedBy: profile.uid,
        updatedAt: serverTimestamp()
      });
      setNewItem({ title: '', value: '' });
      setIsAdding(false);
    } catch (err) {
      await handleFirestoreError(err, OperationType.CREATE, `families/${profile.familyId}/vault`);
    }
  };

  const deleteItem = async () => {
    if (!itemToDelete || !profile?.familyId) return;
    try {
      await deleteDoc(doc(db, 'families', profile.familyId, 'vault', itemToDelete));
      setItemToDelete(null);
    } catch (err) {
      await handleFirestoreError(err, OperationType.DELETE, `families/${profile.familyId}/vault/${itemToDelete}`);
    }
  };

  const toggleVisibility = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const PinPad = ({ onComplete, isSetup = false }: { onComplete: (pin: string) => void, isSetup?: boolean }) => {
    const [pin, setPin] = useState('');
    const length = 4;

    const handleNumber = (n: string) => {
      if (pin.length < length) {
        const newPin = pin + n;
        setPin(newPin);
        if (newPin.length === length) {
          setTimeout(() => {
            onComplete(newPin);
            setPin('');
          }, 200);
        }
      }
    };

    const handleBackspace = () => {
      setPin(pin.slice(0, -1));
    };

    return (
      <div className="flex flex-col items-center">
        <div className="flex gap-4 mb-10">
          {[...Array(length)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: pin.length > i ? [1, 1.2, 1] : 1,
                backgroundColor: pin.length > i ? '#1a1a1a' : '#f1f5f9'
              }}
              className="w-4 h-4 rounded-full border border-slate-200"
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumber(n.toString())}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-slate-50 shadow-soft text-2xl font-black text-[#1a1a1a] hover:bg-slate-50 active:scale-90 transition-all flex items-center justify-center"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumber('0')}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-slate-50 shadow-soft text-2xl font-black text-[#1a1a1a] hover:bg-slate-50 active:scale-90 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-transparent text-slate-300 hover:text-red-400 active:scale-90 transition-all flex items-center justify-center"
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>
    );
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col h-full bg-[#fcfcf9] items-center justify-center p-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm bg-white p-8 md:p-10 rounded-[40px] shadow-premium border border-slate-50 text-center"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
            <Lock size={32} />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-[#1a1a1a] mb-2 tracking-tight">
            {isSettingPassword ? 'Set Vault PIN' : 'Vault Locked'}
          </h2>
          <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-8">
            {isSettingPassword ? 'Choose a 4-digit security code' : 'Access restricted'}
          </p>

          {isSettingPassword ? (
            <div className="space-y-6">
              <PinPad onComplete={handleSetPassword} isSetup />
              <button
                type="button"
                onClick={() => setIsSettingPassword(false)}
                className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-[#1a1a1a] transition-colors"
              >
                Cancel Setup
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {!vaultPassword ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
                    <ShieldAlert className="text-amber-500 shrink-0" size={18} />
                    <p className="text-[10px] md:text-xs text-amber-700 font-bold leading-relaxed">
                      Vault is currently unsecured. Only the Family Head can set the initial vault PIN.
                    </p>
                  </div>
                  {profile?.isHead && (
                    <button
                      type="button"
                      onClick={() => setIsSettingPassword(true)}
                      className="w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-premium"
                    >
                      Set Security PIN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsUnlocked(true)}
                    className="w-full py-4 bg-white border border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    View Anyway
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <PinPad onComplete={handleUnlock} />
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-[10px] font-black uppercase tracking-widest"
                    >
                      {error}
                    </motion.p>
                  )}
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    Enter the family PIN to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-6 md:p-8 pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Protected</p>
            <Lock size={12} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#1a1a1a]">Family Vault</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsUnlocked(false)}
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-indigo-500 transition-all"
            title="Lock Vault"
          >
            <Lock size={18} />
          </button>
          <button
            id="toggle-add-vault-btn"
            onClick={() => setIsAdding(!isAdding)}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${
              isAdding ? 'bg-slate-200 text-slate-600' : 'bg-[#1a1a1a] text-white shadow-premium'
            }`}
          >
            {isAdding ? <Plus size={24} className="rotate-45" /> : <Plus size={24} />}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-6 space-y-6 pb-40">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={addItem} className="bg-white p-6 md:p-8 rounded-[28px] md:rounded-[32px] border border-indigo-100 shadow-premium space-y-4 mb-4">
                <h3 className="text-lg md:text-xl font-black text-[#1a1a1a] mb-2 tracking-tight uppercase tracking-widest text-[10px] text-slate-400">New Secret</h3>
                <input
                  id="vault-title-input"
                  type="text"
                  placeholder="Label (e.g. Wi-Fi)"
                  value={newItem.title || ''}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full p-3 text-base md:text-xl border-b-2 border-slate-50 outline-none focus:border-[#1a1a1a] bg-transparent"
                />
                <input
                  id="vault-value-input"
                  type="text"
                  placeholder="The Secret"
                  value={newItem.value || ''}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  className="w-full p-3 text-base md:text-xl border-b-2 border-slate-50 outline-none focus:border-[#1a1a1a] bg-transparent"
                />
                <button
                  id="save-vault-btn"
                  type="submit"
                  className="w-full py-4 bg-[#1a1a1a] text-white text-base md:text-lg font-bold rounded-[18px] md:rounded-[22px] shadow-lg hover:bg-slate-800 transition-colors mt-4"
                >
                  Safeguard Info
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-soft border border-slate-50 flex flex-col gap-3 md:gap-4 group hover:shadow-premium transition-all"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{item.title}</h3>
                  <button
                    id={`delete-vault-${item.id}`}
                    onClick={() => setItemToDelete(item.id)}
                    className="p-2 text-slate-100 hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 md:pt-4">
                  <span className={`text-base md:text-2xl font-mono tracking-tight transition-all duration-500 overflow-x-auto ${showValues[item.id] ? 'text-indigo-600' : 'text-slate-200 filter blur-sm select-none'}`}>
                    {showValues[item.id] ? item.value : '••••••••••••'}
                  </span>
                  <button
                    id={`toggle-visibility-${item.id}`}
                    onClick={() => toggleVisibility(item.id)}
                    className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-[18px] md:rounded-2xl flex items-center justify-center transition-colors ${showValues[item.id] ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}
                  >
                    {showValues[item.id] ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!loading && items.length === 0 && !isAdding && (
          <div className="text-center py-20">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Key size={48} className="text-slate-200" />
            </div>
            <p className="text-2xl font-bold text-slate-300 tracking-tight">Vault is empty.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Remove Secret?"
        message="This will permanently delete this item from the vault."
        confirmLabel="Remove"
        cancelLabel="Keep Safe"
        onConfirm={deleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
