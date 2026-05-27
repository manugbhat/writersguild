"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to /feed if user is FULLY authenticated (Firebase + Firestore doc).
    // If firebaseUser exists but no user doc, they're an orphan Google sign-in and
    // need to remain on auth pages (signup/login) to complete invite-based signup.
    if (!loading && firebaseUser && user) {
      router.replace("/feed");
    }
  }, [firebaseUser, user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-100 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (firebaseUser && user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-100 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
