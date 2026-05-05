import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Task, UserProfile } from '../types';
import { Plus, Check, Square, Trash2, ShoppingCart, User, Calendar, ArrowUpDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemberAliases } from '../hooks/useMemberAliases';
import { format } from 'date-fns';

import { isToday, startOfDay, endOfDay } from 'date-fns';

import { handleFirestoreError, OperationType } from '../lib/utils';

type SortOption = 'assignee' | 'deadline' | 'time';

export default function TasksView() {
  const { profile } = useAuth();
  const { getAlias } = useMemberAliases();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<UserProfile | null>(null);
  const [deadline, setDeadline] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSortDrawer, setShowSortDrawer] = useState(false);

  useEffect(() => {
    if (!profile?.familyId) return;

    // Fetch Tasks
    const tasksPath = `families/${profile.familyId}/tasks`;
    const tasksRef = collection(db, tasksPath);
    const tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      if (!error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.LIST, tasksPath);
      }
    });

    // Fetch Family Members
    const membersQuery = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setMembers(membersData);
    }, (error) => {
      console.warn('TasksView member sync delay:', error);
    });

    return () => {
      unsubTasks();
      unsubMembers();
    };
  }, [profile?.familyId]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    const sorted = list.sort((a, b) => {
      if (sortBy === 'assignee') {
        const nameA = a.assignedName || 'zzz';
        const nameB = b.assignedName || 'zzz';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'deadline') {
        const timeA = a.deadline?.toMillis() || Infinity;
        const timeB = b.deadline?.toMillis() || Infinity;
        return timeA - timeB;
      }
      // Default: time (createdAt)
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });

    return {
      active: sorted.filter(t => !t.isCompleted),
      completed: sorted.filter(t => t.isCompleted)
    };
  }, [tasks, sortBy]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !profile?.familyId) return;

    try {
      const tasksPath = `families/${profile.familyId}/tasks`;
      await addDoc(collection(db, tasksPath), {
        taskName: newTaskName,
        isCompleted: false,
        assignedId: selectedAssignee?.uid || null,
        assignedName: selectedAssignee?.displayName || null,
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
        createdBy: profile.uid,
        createdByName: profile.displayName || 'Someone',
        createdAt: serverTimestamp()
      });
      setNewTaskName('');
      setSelectedAssignee(null);
      setDeadline('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `families/${profile.familyId}/tasks`);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!profile?.familyId || !profile) return;
    const taskRef = doc(db, 'families', profile.familyId, 'tasks', task.id);
    try {
      const newStatus = !task.isCompleted;
      await updateDoc(taskRef, {
        isCompleted: newStatus,
        completedById: newStatus ? profile.uid : null,
        completedByName: newStatus ? profile.displayName : null,
        updatedAt: serverTimestamp() // Added updatedAt for validation consistency
      });
    } catch (err) {
      await handleFirestoreError(err, OperationType.UPDATE, `families/${profile.familyId}/tasks/${task.id}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!profile?.familyId) return;
    const taskRef = doc(db, 'families', profile.familyId, 'tasks', taskId);
    try {
      await deleteDoc(taskRef);
    } catch (err) {
      await handleFirestoreError(err, OperationType.DELETE, `families/${profile.familyId}/tasks/${taskId}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcf9]">
      <header className="p-6 md:p-8 pb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
          <div>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Cooperation</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#1a1a1a]">Family List</h1>
          </div>
          <div className="w-fit bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider border border-emerald-100 shadow-sm">
            {filteredTasks.active.length} Remaining
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSortDrawer(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl md:rounded-full bg-white border border-slate-100 text-[#1a1a1a] shadow-soft hover:border-indigo-100 transition-all active:scale-95 group"
          >
            <ArrowUpDown size={14} className="text-indigo-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sort: {sortBy}</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl md:rounded-full transition-all ml-auto shrink-0 shadow-premium ${
              showAddForm ? 'bg-red-500 text-white rotate-45' : 'bg-[#1a1a1a] text-white'
            }`}
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-6 space-y-8 pb-40">
        <AnimatePresence>
          {showAddForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              onSubmit={addTask} 
              className="space-y-4 overflow-hidden"
            >
              <div className="flex flex-col gap-6 bg-white/50 p-6 rounded-[32px] border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1 flex items-center gap-2">
                      <User size={12} className="text-indigo-400" /> Assign To
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.map(member => (
                        <button
                          key={member.uid}
                          type="button"
                          onClick={() => setSelectedAssignee(selectedAssignee?.uid === member.uid ? null : member)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all relative ${
                            selectedAssignee?.uid === member.uid 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg z-10' 
                            : 'bg-white border-slate-100 text-slate-500'
                          }`}
                        >
                          {getAlias(member.uid, member.displayName)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1 flex items-center gap-2">
                      <Clock size={12} className="text-amber-500" /> Set Deadline
                    </p>
                    <input 
                      type="datetime-local"
                      value={deadline || ''}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none w-full shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    id="task-input"
                    type="text"
                    value={newTaskName || ''}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Task details..."
                    className="flex-1 bg-white p-5 rounded-[20px] shadow-soft border border-slate-100 text-base outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-[#1a1a1a] placeholder:text-slate-300"
                  />
                  <button
                    id="add-task-btn"
                    type="submit"
                    className="bg-[#1a1a1a] text-white px-6 flex items-center justify-center rounded-[20px] shadow-premium hover:bg-slate-800 transition-all disabled:opacity-20"
                    disabled={!newTaskName.trim()}
                  >
                    <Plus size={24} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <section className="space-y-4">
          {filteredTasks.active.length > 0 && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Active Chores</p>
          )}
          <AnimatePresence initial={false}>
            {filteredTasks.active.map((task) => (
              <ProjectTaskCard 
                key={task.id} 
                task={task} 
                profile={profile} 
                getAlias={getAlias} 
                onToggle={() => toggleTask(task)} 
                onDelete={() => deleteTask(task.id)} 
              />
            ))}
          </AnimatePresence>
        </section>

        <section className="space-y-4">
          {filteredTasks.completed.length > 0 && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-2 pt-4">Recently Done</p>
          )}
          <AnimatePresence initial={false}>
            {filteredTasks.completed.map((task) => (
              <ProjectTaskCard 
                key={task.id} 
                task={task} 
                profile={profile} 
                getAlias={getAlias} 
                onToggle={() => toggleTask(task)} 
                onDelete={() => deleteTask(task.id)} 
              />
            ))}
          </AnimatePresence>
        </section>

        {!loading && tasks.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart size={48} className="text-slate-200" />
            </div>
            <p className="text-2xl font-bold text-slate-300 tracking-tight">Everything is organized.</p>
          </div>
        )}
      </div>

      {/* Sort Drawer */}
      <AnimatePresence>
        {showSortDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSortDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] shadow-2xl z-[101] p-6 pb-8"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Preferences</p>
                <h2 className="text-xl font-black text-[#1a1a1a] tracking-tight">Sort Tasks</h2>
              </div>
              
              <div className="space-y-2">
                {(['time', 'assignee', 'deadline'] as SortOption[]).map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setShowSortDrawer(false);
                    }}
                    className={`w-full p-4 rounded-[20px] flex items-center justify-between transition-all group ${
                      sortBy === option 
                      ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-900 shadow-md' 
                      : 'bg-slate-50 border-2 border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm font-black uppercase tracking-widest">{option}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      sortBy === option 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : 'border-slate-200 bg-white'
                    }`}>
                      {sortBy === option && <Check size={10} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowSortDrawer(false)}
                className="w-full mt-6 py-4 bg-[#1a1a1a] text-white rounded-[18px] font-black uppercase tracking-widest text-[10px] shadow-premium hover:bg-slate-800 transition-all active:scale-95"
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ProjectTaskCardProps {
  task: Task;
  profile: any;
  getAlias: (id: string, name: string) => string;
  onToggle: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

const ProjectTaskCard: React.FC<ProjectTaskCardProps> = ({ task, profile, getAlias, onToggle, onDelete }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-5 p-5 rounded-[28px] border transition-all ${
        task.isCompleted 
        ? 'bg-[#f8f9fa]/50 border-slate-50 opacity-60 shadow-none' 
        : 'bg-white border-slate-100 shadow-soft hover:shadow-premium group'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
          task.isCompleted 
          ? 'bg-emerald-50 text-emerald-500' 
          : 'bg-slate-50 text-slate-200 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:text-indigo-400'
        }`}
      >
        {task.isCompleted ? <Check size={28} strokeWidth={3} /> : <Square size={28} />}
      </button>
      
      <div 
        className="flex-1 cursor-pointer py-1 min-w-0"
        onClick={onToggle}
      >
        <p className={`text-lg font-bold truncate transition-all ${
          task.isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-[#1a1a1a]'
        }`}>
          {task.taskName}
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          {task.assignedName && (
            <div className="flex items-center gap-1.5 bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/50">
              <User size={10} className={task.isCompleted ? 'text-slate-300' : 'text-indigo-500'} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${
                task.isCompleted ? 'text-slate-300' : 'text-indigo-600'
              }`}>
                To: {getAlias(task.assignedId || '', task.assignedName || 'Someone')}
              </span>
            </div>
          )}
          {task.createdByName && (
            <div className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-lg">
              <User size={10} className="text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                By: {getAlias(task.createdBy, task.createdByName || 'Someone')}
              </span>
            </div>
          )}
          {task.completedByName && task.isCompleted && (
            <div className="flex items-center gap-1.5 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100/50">
              <Check size={10} className="text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                Done By: {getAlias(task.completedById || '', task.completedByName || 'Someone')}
              </span>
            </div>
          )}
          {task.deadline && (
            <div className="flex items-center gap-1.5 bg-amber-50/50 px-2.5 py-1 rounded-lg border border-amber-100/50">
              <Clock size={10} className={task.isCompleted ? 'text-slate-200' : 'text-amber-500'} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${
                task.isCompleted ? 'text-slate-300' : 'text-amber-700'
              }`}>
                {format(task.deadline.toDate(), 'MMM d, h:mm a')}
              </span>
            </div>
          )}
        </div>
      </div>

      {task.createdBy === profile.uid && (
        <button
          onClick={onDelete}
          className="p-3 text-slate-200 hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          title="Remove task"
        >
          <Trash2 size={22} />
        </button>
      )}
    </motion.div>
  );
}
