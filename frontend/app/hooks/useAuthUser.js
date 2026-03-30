import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../lib/firebase';

export function useAuthUser() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDB = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      if (!u) {
        setUserData(null);
        setLoading(false);
        if (unsubDB) {
          unsubDB();
          unsubDB = null;
        }
        return;
      }

      // If user exists, fetch user profile from RTDB
      const userRef = ref(db, `users/${u.uid}`);
      unsubDB = onValue(userRef, (snap) => {
        setUserData(snap.exists() ? snap.val() : null);
        setLoading(false);
      }, (error) => {
        console.error("Failed to fetch user data:", error);
        setUserData(null);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubDB) unsubDB();
    };
  }, []);

  return { user, userData, loading };
}
