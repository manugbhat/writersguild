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
    console.log("[AuthContext] fetchUser called for uid:", fbUser.uid);
    const docRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log("[AuthContext] User doc found, setting user");
      setUser({ uid: fbUser.uid, ...snap.data() } as User);
    } else {
      console.warn("[AuthContext] User doc DOES NOT EXIST for uid:", fbUser.uid, "— user must complete invite-based signup");
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) await fetchUser(firebaseUser);
  };

  useEffect(() => {
    console.log("[AuthContext] Setting up onAuthStateChanged listener");
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      console.log("[AuthContext] onAuthStateChanged fired, fbUser:", fbUser?.uid || "null");
      setLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchUser(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
      console.log("[AuthContext] Loading complete");
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
