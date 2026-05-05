import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { PartyPopper, Cake, X, Bell } from 'lucide-react';
import { UserProfile } from '../types';
import { format, isSameDay, parseISO, addDays } from 'date-fns';

export default function BirthdayWish() {
  const { profile } = useAuth();
  const [showWish, setShowWish] = useState(false);
  const [celebratingUser, setCelebratingUser] = useState<string | null>(null);

  useEffect(() => {
    // Request notification permission if supported
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!profile?.familyId) return;

    // Fetch family members to check birthdays
    const q = query(collection(db, 'users'), where('familyId', '==', profile.familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => doc.data() as UserProfile);
      const today = new Date();
      const tomorrow = addDays(today, 1);
      
      const todayBirthday = members.find(m => {
        if (!m.birthday) return false;
        try {
          const bday = parseISO(m.birthday);
          return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
        } catch (e) {
          return false;
        }
      });

      if (todayBirthday) {
        if (todayBirthday.uid === profile.uid) {
          setShowWish(true);
          setCelebratingUser('you');
        } else {
          setCelebratingUser(todayBirthday.displayName);
        }
        
        // Auto-post to feed if it's the first time
        // Note: Real notifications "without opening app" would be handled by a cloud function.
        // As a fallback, we check if we should notify others when someone opens the app.
        checkAndNotify(todayBirthday, profile.familyId!, 'today');
      }

      // Check upcoming (tomorrow)
      const tomorrowBirthday = members.find(m => {
        if (!m.birthday) return false;
        try {
          const bday = parseISO(m.birthday);
          return bday.getMonth() === tomorrow.getMonth() && bday.getDate() === tomorrow.getDate();
        } catch (e) {
          return false;
        }
      });

      if (tomorrowBirthday) {
        checkAndNotify(tomorrowBirthday, profile.familyId!, 'tomorrow');
      }
    });

    return () => unsubscribe();
  }, [profile?.familyId, profile?.uid]);

  const checkAndNotify = async (user: UserProfile, familyId: string, timing: 'today' | 'tomorrow') => {
    // Check if a notification post already exists for this birthday this year
    const year = new Date().getFullYear();
    const notificationKey = `bday_notif_${user.uid}_${year}_${timing}`;
    
    if (localStorage.getItem(notificationKey)) return;

    try {
      // Post to family feed
      const content = timing === 'today' 
        ? `🎂 Today is ${user.displayName}'s birthday! Let's celebrate! 🎉`
        : `🎈 Tomorrow is ${user.displayName}'s birthday! Get ready! 🎁`;

      await addDoc(collection(db, 'families', familyId, 'posts'), {
        authorId: 'system',
        authorName: 'Kinly Robot',
        content,
        timestamp: serverTimestamp(),
      });

      // Browser notification if app is in background/foreground and permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Family Birthday 🎂", {
          body: content,
          icon: user.photoURL || '/icon.png'
        });
      }

      localStorage.setItem(notificationKey, 'true');
    } catch (e) {
      console.error("Failed to post birthday notification", e);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showWish && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
              
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 bg-gradient-to-tr from-pink-100 to-indigo-100 rounded-full flex items-center justify-center text-pink-500">
                  <Cake size={48} className="animate-bounce" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-slate-800 mb-4">Happy Birthday, {profile?.displayName}!</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Wishing you a day filled with joy, laughter, and all your favorite things. 
                The whole family is celebrating with you today! 🎈
              </p>

              <button
                onClick={() => setShowWish(false)}
                className="w-full h-16 bg-[#1a1a1a] text-white rounded-3xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
              >
                <span>Thank you!</span>
                <PartyPopper size={20} />
              </button>

              <div className="absolute top-4 right-4">
                <button onClick={() => setShowWish(false)} className="p-2 text-slate-300 hover:text-slate-500">
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebrating user banner */}
      {celebratingUser && celebratingUser !== 'you' && (
        <div className="fixed top-24 left-6 right-6 z-40">
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-premium flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Cake size={20} className="text-indigo-200" />
              <span className="font-semibold text-sm">Today is {celebratingUser}'s birthday! 🎉</span>
            </div>
            <X size={16} className="opacity-60 cursor-pointer" onClick={() => setCelebratingUser(null)} />
          </motion.div>
        </div>
      )}
    </>
  );
}
