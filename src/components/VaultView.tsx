import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { VaultItem } from '../types';
import { Lock, Eye, EyeOff, Plus, Trash2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';

export default function VaultView() {
  const { profile } = useAuth();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [newItem, setNewItem] = useState({ title: '', value: '' });
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.familyId) return;

    const vaultRef = collection(db, 'families', profile.familyId, 'vault');
    const q = query(vaultRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VaultItem[];
      setItems(itemsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.familyId]);

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
      console.error('Error adding vault item:', err);
    }
  };

  const deleteItem = async () => {
    if (!itemToDelete || !profile?.familyId) return;
    try {
      await deleteDoc(doc(db, 'families', profile.familyId, 'vault', itemToDelete));
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting vault item:', err);
    }
  };

  const toggleVisibility = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-8 pb-4 flex justify-between items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Protected</p>
          <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a]">Family Vault</h1>
        </div>
        <button
          id="toggle-add-vault-btn"
          onClick={() => setIsAdding(!isAdding)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isAdding ? 'bg-slate-200 text-slate-600' : 'bg-[#1a1a1a] text-white shadow-premium'
          }`}
        >
          {isAdding ? <Plus size={28} className="rotate-45" /> : <Plus size={28} />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-40">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={addItem} className="bg-white p-8 rounded-[32px] border border-indigo-100 shadow-premium space-y-4 mb-4">
                <h3 className="text-xl font-black text-[#1a1a1a] mb-2 tracking-tight">New Family Secret</h3>
                <input
                  id="vault-title-input"
                  type="text"
                  placeholder="Label (e.g. Wi-Fi)"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full p-4 text-xl border-b-2 border-slate-50 outline-none focus:border-[#1a1a1a] bg-transparent"
                />
                <input
                  id="vault-value-input"
                  type="text"
                  placeholder="The Secret"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  className="w-full p-4 text-xl border-b-2 border-slate-50 outline-none focus:border-[#1a1a1a] bg-transparent"
                />
                <button
                  id="save-vault-btn"
                  type="submit"
                  className="w-full py-5 bg-[#1a1a1a] text-white text-xl font-bold rounded-[22px] shadow-lg hover:bg-slate-800 transition-colors mt-4"
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
                className="bg-white p-8 rounded-[32px] shadow-soft border border-slate-50 flex flex-col gap-4 group hover:shadow-premium transition-all"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{item.title}</h3>
                  <button
                    id={`delete-vault-${item.id}`}
                    onClick={() => setItemToDelete(item.id)}
                    className="p-2 text-slate-100 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <span className={`text-2xl font-mono tracking-tight transition-all duration-500 overflow-x-auto ${showValues[item.id] ? 'text-indigo-600' : 'text-slate-200 filter blur-sm select-none'}`}>
                    {showValues[item.id] ? item.value : '••••••••••••'}
                  </span>
                  <button
                    id={`toggle-visibility-${item.id}`}
                    onClick={() => toggleVisibility(item.id)}
                    className={`p-3 rounded-xl transition-colors ${showValues[item.id] ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}
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
