"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (firebaseUser && !user) {
      signOut().then(() => router.replace("/signup"));
    }
  }, [firebaseUser, user, loading, router, signOut]);

  if (loading || (firebaseUser && !user)) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !user) return null;

  return <div className="min-h-screen bg-white">{children}</div>;
}
