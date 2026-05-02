import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import FeedView from './FeedView';
import TasksView from './TasksView';
import VaultView from './VaultView';
import OnboardingView from './OnboardingView';
import { Home, List, Shield, LogOut } from 'lucide-react';
import { logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'vault'>('home');

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
    <div className="fixed inset-0 flex flex-col bg-[#fcfcf9] font-sans overflow-hidden">
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="h-full"
          >
            {activeTab === 'home' && <FeedView />}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'vault' && <VaultView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="px-6 pb-8 pt-4">
        <nav className="h-[84px] glass rounded-[36px] flex items-center justify-around px-8 shadow-premium border-white/40 ring-1 ring-black/5">
          <NavButton
            id="nav-home"
            active={activeTab === 'home'}
            icon={<Home size={28} strokeWidth={activeTab === 'home' ? 2.5 : 2} />}
            label="Wall"
            onClick={() => setActiveTab('home')}
          />
          <NavButton
            id="nav-tasks"
            active={activeTab === 'tasks'}
            icon={<List size={28} strokeWidth={activeTab === 'tasks' ? 2.5 : 2} />}
            label="List"
            onClick={() => setActiveTab('tasks')}
          />
          <NavButton
            id="nav-vault"
            active={activeTab === 'vault'}
            icon={<Shield size={28} strokeWidth={activeTab === 'vault' ? 2.5 : 2} />}
            label="Vault"
            onClick={() => setActiveTab('vault')}
          />
        </nav>
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick, id }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, id: string }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
        active ? 'text-[#1a1a1a] scale-105' : 'text-slate-400'
      }`}
    >
      <div className="relative">
        {icon}
        {active && (
          <motion.div 
            layoutId="nav-indicator"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1a1a1a] rounded-full"
          />
        )}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-40'}`}>
        {label}
      </span>
    </button>
  );
}
