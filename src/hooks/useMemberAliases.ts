import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';

export function useMemberAliases() {
  const { profile } = useAuth();
  const [aliases, setAliases] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile?.uid) return;

    const aliasesRef = collection(db, 'users', profile.uid, 'memberAliases');
    const unsubscribe = onSnapshot(aliasesRef, (snapshot) => {
      const aliasData: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        aliasData[doc.id] = doc.data().alias;
      });
      setAliases(aliasData);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const getAlias = (uid: string, defaultName: string) => {
    return aliases[uid] || defaultName;
  };

  return { aliases, getAlias };
}
