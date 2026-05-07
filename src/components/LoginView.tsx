import React, { useState } from 'react';
import { signInWithGoogle, db } from '../lib/firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getGoogleBirthday } from '../lib/utils';
import { ShieldCheck, Heart, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginView() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (accessToken) {
        const birthday = await getGoogleBirthday(accessToken);
        if (birthday) {
          // Update the user document with the birthday
          const userDocRef = doc(db, 'users', result.user.uid);
          // Use setDoc with merge: true to ensure it works even if the document was just created or doesn't exist yet
          await setDoc(userDocRef, {
            birthday,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(err => {
            console.error("Could not set birthday", err);
          });
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcf9] flex flex-col items-center justify-center p-6 md:p-8 font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12 text-center"
        >
          <div className="inline-flex p-4 md:p-5 bg-[#1a1a1a] rounded-[24px] md:rounded-[32px] mb-6 md:mb-8 text-white shadow-premium">
             <Heart size={40} fill="currentColor" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-[#1a1a1a]">Kinly</h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
            The private digital wall for your family.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full space-y-6"
        >
          <div className="space-y-4">
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className={`w-full h-16 md:h-[72px] bg-[#1a1a1a] text-white rounded-[20px] md:rounded-[24px] text-lg md:text-xl font-bold flex items-center justify-center gap-4 shadow-premium hover:bg-slate-800 transition-all active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="bg-white p-1 rounded-lg">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDd1QCWvNJsFxcoMgZ4dSJBwuwVGzRLNroCzK_qUOjABmkLaup1Oi4-CxL_3b13j28_hpVPmt0Ve6x-zvwqg&s&ec=121643154" alt="Google" className="w-5 h-5 md:w-6 md:h-6" />
                )}
              </div>
              {isLoading ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[28px] border border-slate-100 shadow-soft text-center group hover:border-[#1a1a1a]/10 transition-colors">
              <ShieldCheck className="mx-auto mb-2 md:mb-3 text-slate-300 group-hover:text-indigo-500 transition-colors" size={24} />
              <p className="font-bold text-slate-800 text-sm md:text-base">Private</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[28px] border border-slate-100 shadow-soft text-center group hover:border-[#1a1a1a]/10 transition-colors">
              <LayoutGrid className="mx-auto mb-2 md:mb-3 text-slate-300 group-hover:text-amber-500 transition-colors" size={24} />
              <p className="font-bold text-slate-800 text-sm md:text-base">Simple</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
