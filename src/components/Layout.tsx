import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import FeedView from './FeedView';
import TasksView from './TasksView';
import VaultView from './VaultView';
import MembersView from './MembersView';
import OnboardingView from './OnboardingView';
import ProfileView from './ProfileView';
import BirthdayWish from './BirthdayWish';
import { Home, List, Shield, Users, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export default function Layout() {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'vault' | 'members' | 'profile'>('home');
  const [isNavVisible, setIsNavVisible] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcf9]">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#1a1a1a] border-t-transparent"></div>
      </div>
    );
  }

  if (!profile?.familyId) {
    return <OnboardingView />;
  }

  return (
    <div className="fixed inset-0 bg-[#fcfcf9] font-sans flex flex-col overflow-hidden">
      <main className="flex-1 relative overflow-hidden pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="h-full w-full"
          >
            {activeTab === 'home' && (
              <FeedView 
                onProfileClick={() => setActiveTab('profile')} 
                onNavVisibilityChange={setIsNavVisible}
              />
            )}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'members' && <MembersView />}
            {activeTab === 'vault' && <VaultView />}
            {activeTab === 'profile' && <ProfileView onBack={() => setActiveTab('home')} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quick Member Contacts Strip */}
      {activeTab === 'home' && isNavVisible && (
        <div className="fixed bottom-24 left-0 right-0 px-4 pointer-events-none z-40">
          <MemberStrip onMemberClick={() => setActiveTab('members')} />
        </div>
      )}

      {/* Modern Floating Bottom Nav */}
      <AnimatePresence>
        {isNavVisible && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 pb-8 pointer-events-none z-50"
          >
        <nav className="h-[76px] max-w-lg mx-auto glass rounded-[32px] flex items-center justify-around px-1 shadow-premium border-white/40 ring-1 ring-black/5 pointer-events-auto">
          <NavButton
            id="nav-home"
            active={activeTab === 'home'}
            icon={<Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />}
            label="Home"
            onClick={() => setActiveTab('home')}
          />
          <NavButton
            id="nav-tasks"
            active={activeTab === 'tasks'}
            icon={<List size={22} strokeWidth={activeTab === 'tasks' ? 2.5 : 2} />}
            label="Tasks"
            onClick={() => setActiveTab('tasks')}
          />
          <NavButton
            id="nav-members"
            active={activeTab === 'members'}
            icon={<Users size={22} strokeWidth={activeTab === 'members' ? 2.5 : 2} />}
            label="Family"
            onClick={() => setActiveTab('members')}
          />
          <NavButton
            id="nav-vault"
            active={activeTab === 'vault'}
            icon={<Shield size={22} strokeWidth={activeTab === 'vault' ? 2.5 : 2} />}
            label="Vault"
            onClick={() => setActiveTab('vault')}
          />
        </nav>
      </motion.div>
    )}
  </AnimatePresence>
</div>
);
}

function MemberStrip({ onMemberClick }: { onMemberClick: () => void }) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile?.familyId) return;
    const q = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(doc => doc.data() as UserProfile).filter(m => m.uid !== profile?.uid));
    }, (error) => {
      console.warn('MemberStrip sync delay:', error);
    });
    return unsubscribe;
  }, [profile?.familyId, profile?.uid]);

  return (
    <div className="max-w-lg mx-auto flex gap-3 overflow-x-auto no-scrollbar py-2 pointer-events-auto">
      {members.map((member) => (
        <motion.button
          key={member.uid}
          whileTap={{ scale: 0.9 }}
          onClick={onMemberClick}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-soft border-2 border-white bg-slate-100 flex items-center justify-center transition-all ${member.isHead ? 'head-border ring-offset-0 scale-90' : ''}`}>
            {member.photoURL ? (
              <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon size={20} className="text-slate-300" />
            )}
          </div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
            {member.uid === profile?.uid ? 'You' : member.displayName.split(' ')[0]}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

function NavButton({ active, icon, label, onClick, id }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, id: string }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all outline-none active:scale-95 ${
        active ? 'text-[#1a1a1a]' : 'text-slate-300'
      }`}
    >
      <div className={`p-1 rounded-2xl transition-colors ${active ? 'bg-black/5' : ''}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${active ? 'opacity-100' : 'opacity-40'}`}>
        {label}
      </span>
    </button>
  );
}
