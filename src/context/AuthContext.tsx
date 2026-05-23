"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User } from "@/lib/types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (fbUser: FirebaseUser) => {
    const docRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setUser({ uid: fbUser.uid, ...snap.data() } as User);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) await fetchUser(firebaseUser);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchUser(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
