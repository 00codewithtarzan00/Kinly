import React from 'react';
import { Info, Heart, Shield, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function AboutView() {
  return (
    <div className="h-full overflow-y-auto px-6 pt-12 pb-32">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-[#1a1a1a] tracking-tight mb-2">About Kinly</h1>
        <p className="text-slate-500 text-lg">Your family's digital heartbeat.</p>
      </header>

      <div className="space-y-8">
        <section className="bg-white p-8 rounded-[32px] shadow-soft border border-slate-50">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
            <Heart size={24} />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed">
            Kinly was built to bring families closer in a noisy digital world. 
            No ads, no algorithms, just your family. A private space to share memories, 
            organize tasks, and keep your most important secrets safe.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-50"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Shield size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Privacy First</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your data is encrypted and only accessible by your family members. We never sell your info.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-50"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
              <Zap size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Simple & Fast</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Designed to feel like a quick glance at the fridge door. No complex menus or settings.
            </p>
          </motion.div>
        </div>

        <section className="bg-[#1a1a1a] p-8 rounded-[32px] text-white">
          <div className="flex items-center gap-4 mb-6">
            <Users className="text-indigo-400" />
            <h2 className="text-2xl font-semibold">Community</h2>
          </div>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Kinly is a labor of love. We're constantly improving based on how real families use the app.
          </p>
          <div className="pt-6 border-t border-white/10 text-slate-500 text-sm flex justify-between items-center">
            <span>Version 1.2.0</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
