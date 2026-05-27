"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser) {
        router.replace("/feed");
      } else {
        router.replace("/login");
      }
    }
  }, [firebaseUser, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="animate-pulse text-stone-400">Loading...</div>
    </div>
  );
}
