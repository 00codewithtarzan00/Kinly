import React from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { ShieldCheck, Heart, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginView() {
  return (
    <div className="min-h-screen bg-[#fcfcf9] flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex p-5 bg-[#1a1a1a] rounded-[32px] mb-8 text-white shadow-premium">
             <Heart size={56} fill="currentColor" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-[#1a1a1a]">Kinly</h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            The private digital wall for your family.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full space-y-8"
        >
          <button
            id="google-login-btn"
            onClick={signInWithGoogle}
            className="w-full h-[72px] bg-[#1a1a1a] text-white rounded-[24px] text-xl font-bold flex items-center justify-center gap-4 shadow-premium hover:bg-slate-800 transition-all active:scale-95"
          >
            <div className="bg-white p-1 rounded-lg">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/nps/google.svg" alt="Google" className="w-6 h-6" />
            </div>
            Sign in for Family
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-soft text-center group hover:border-[#1a1a1a]/10 transition-colors">
              <ShieldCheck className="mx-auto mb-3 text-slate-300 group-hover:text-indigo-500 transition-colors" size={32} />
              <p className="font-bold text-slate-800">Private</p>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-soft text-center group hover:border-[#1a1a1a]/10 transition-colors">
              <LayoutGrid className="mx-auto mb-3 text-slate-300 group-hover:text-amber-500 transition-colors" size={32} />
              <p className="font-bold text-slate-800">Simple</p>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-bold tracking-[0.2em] text-slate-300 uppercase">
              Secure • Shared • Sacred
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
