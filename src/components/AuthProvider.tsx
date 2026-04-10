'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Force local persistence to ensure sessions survive refreshes
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user document from Firestore to get `shortId` and `friends`
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              uid: user.uid,
              email: user.email,
              displayName: data.username || user.displayName || 'Player',
              shortId: data.shortId || null,
            });
          } else {
            // First time Google redirect log-in might land here! Auto-create document.
            const shortId = '#' + Math.floor(100000 + Math.random() * 900000).toString();
            const defaultName = user.displayName || 'Player';
            
            await setDoc(doc(db, 'users', user.uid), {
              username: defaultName,
              email: user.email,
              friends: [],
              shortId
            });

            setUser({
              uid: user.uid,
              email: user.email,
              displayName: defaultName,
              shortId,
            });
          }
        } catch (e) {
          console.error("Error fetching user data", e);
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Player',
            shortId: null,
          });
        }
      } else {
        // Keep the state as is if they are a guest, otherwise null
        // The store handles distinguishing guests
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
