import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Task } from '../types';
import { Plus, Check, Square, Trash2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TasksView() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.familyId) return;

    const tasksRef = collection(db, 'families', profile.familyId, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.familyId]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !profile?.familyId) return;

    try {
      await addDoc(collection(db, 'families', profile.familyId, 'tasks'), {
        taskName: newTaskName,
        isCompleted: false,
        createdBy: profile.uid,
        createdAt: serverTimestamp()
      });
      setNewTaskName('');
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!profile?.familyId) return;
    const taskRef = doc(db, 'families', profile.familyId, 'tasks', task.id);
    try {
      await updateDoc(taskRef, {
        isCompleted: !task.isCompleted
      });
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!profile?.familyId) return;
    const taskRef = doc(db, 'families', profile.familyId, 'tasks', taskId);
    try {
      await deleteDoc(taskRef);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-8 pb-4 flex justify-between items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Cooperation</p>
          <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a]">Shared List</h1>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider border border-emerald-100">
          {tasks.filter(t => !t.isCompleted).length} Tasks Left
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-40">
        <form onSubmit={addTask} className="mb-8 flex gap-3">
            <input
              id="task-input"
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="What do we need today?"
              className="flex-1 bg-white p-6 rounded-[24px] shadow-soft border border-slate-100 text-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-[#1a1a1a]"
            />
            <button
              id="add-task-btn"
              type="submit"
              className="bg-[#1a1a1a] text-white p-6 rounded-[24px] shadow-premium hover:bg-slate-800 transition-colors"
            >
              <Plus size={32} strokeWidth={2.5} />
            </button>
        </form>

        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-center gap-6 p-6 rounded-[28px] border transition-all ${
                task.isCompleted 
                ? 'bg-slate-50 border-transparent shadow-none' 
                : 'bg-white border-slate-50 shadow-soft hover:shadow-premium'
              }`}
            >
              <button
                id={`toggle-task-${task.id}`}
                onClick={() => toggleTask(task)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  task.isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 text-slate-200 border border-slate-100'
                }`}
              >
                {task.isCompleted ? <Check size={24} strokeWidth={3} /> : <Square size={24} />}
              </button>
              
              <div 
                className="flex-1 cursor-pointer py-1"
                onClick={() => toggleTask(task)}
              >
                <p className={`text-xl font-bold transition-all ${
                  task.isCompleted ? 'text-slate-300 line-through decoration-slate-200 decoration-2' : 'text-[#1a1a1a]'
                }`}>
                  {task.taskName}
                </p>
              </div>

              <button
                id={`delete-task-${task.id}`}
                onClick={() => deleteTask(task.id)}
                className="p-3 text-slate-200 hover:text-red-400 transition-colors"
                title="Remove task"
              >
                <Trash2 size={24} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && tasks.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart size={48} className="text-slate-200" />
            </div>
            <p className="text-2xl font-bold text-slate-300 tracking-tight">Everything is organized.</p>
          </div>
        )}
      </div>
    </div>
  );
}
