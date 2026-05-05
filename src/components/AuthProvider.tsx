import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isInitialized: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isInitialized: false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check localStorage for remembered familyId if any
    const localFamilyId = localStorage.getItem('familyId');
    const sanitizedFamilyId = (localFamilyId && localFamilyId.length === 6) ? localFamilyId : null;
    
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // Clear previous sub-listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Register Push Token (if supported)
        const registerPush = async () => {
          try {
            const m = await messaging();
            if (m) {
              const token = await getToken(m);
              if (token) {
                // Use setDoc with merge to avoid failure if doc doesn't exist yet
                await setDoc(userDocRef, { 
                  fcmToken: token,
                  updatedAt: serverTimestamp()
                }, { merge: true });
              }
            }
          } catch (e) {
            console.warn("Push token registration skipped:", e);
          }
        };
        unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setLoading(false);
            setIsInitialized(true);
            // Register Push Token (if supported) only after profile doc exists
            registerPush();
          } else {
            // New user (Google or Anonymous)
            const initialProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Family Member',
              photoURL: firebaseUser.photoURL,
              familyId: sanitizedFamilyId,
              isHead: false,
              email: firebaseUser.email,
              updatedAt: serverTimestamp() as any,
            };
            console.log("Setting up initial profile for new user:", firebaseUser.uid, initialProfile);
            try {
              await setDoc(userDocRef, initialProfile, { merge: true });
            } catch (err) {
              console.error("Initial profile setup error:", err);
              setProfile(initialProfile);
              setLoading(false);
              setIsInitialized(true);
            }
          }
        }, (err) => {
          // If the profile document doesn't exist yet, we might get a transient permission error on list/get
          // but on the profile doc itself, we should always have "get" permission if auth.uid == uid.
          if (!err.message.includes('permission')) {
            console.error("Profile sync error:", err);
          }
          setLoading(false);
          setIsInitialized(true);
        });
      } else {
        // No user logged in at all
        setProfile(null);
        setLoading(false);
        setIsInitialized(true);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const logout = async () => {
    console.log('Logging out...');
    try {
      // Clear state first to update UI immediately
      setProfile(null);
      setUser(null);
      
      // Clear storage
      localStorage.clear();
      
      // Sign out from Firebase if possible
      await auth.signOut();
      
      console.log('Sign out successful');
      
      // Hard reload to clean up all states/listeners
      window.location.href = window.location.origin;
    } catch (error) {
      console.error('Logout error:', error);
      // Still try to reload if something fails
      window.location.href = window.location.origin;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isInitialized, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
