"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BookOpen, ChevronRight, Check } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"invite" | "account">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkInvite = async () => {
    setInviteError("");
    setCheckingInvite(true);
    try {
      const codeRef = doc(db, "inviteCodes", inviteCode.trim().toUpperCase());
      const snap = await getDoc(codeRef);
      if (!snap.exists()) {
        setInviteError("Invalid invite code.");
      } else if (snap.data().used) {
        setInviteError("This invite code has already been used.");
      } else {
        setStep("account");
      }
    } catch {
      setInviteError("Failed to verify invite code. Try again.");
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      await setDoc(doc(db, "users", cred.user.uid), {
        displayName: name,
        email,
        photoURL: "",
        bio: "",
        groupIds: [],
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "inviteCodes", inviteCode.trim().toUpperCase()), {
        used: true,
        usedBy: cred.user.uid,
      });

      router.push("/feed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
      } else if (msg.includes("weak-password")) {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-2xl mb-4 shadow-lg">
          <BookOpen size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Join WritersGuild</h1>
        <p className="text-stone-500 text-sm mt-1">
          {step === "invite" ? "Enter your invite code to get started" : "Create your account"}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {["invite", "account"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? "bg-amber-600 text-white"
                  : s === "invite" && step === "account"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-stone-100 text-stone-400"
              }`}
            >
              {s === "invite" && step === "account" ? <Check size={14} /> : i + 1}
            </div>
            <span className="text-xs text-stone-500 capitalize">{s}</span>
            {i < 1 && <ChevronRight size={14} className="text-stone-300" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {step === "invite" ? (
          <div className="flex flex-col gap-4">
            <Input
              label="Invite Code"
              placeholder="e.g. GUILD-2024"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              error={inviteError}
              className="uppercase tracking-widest"
            />
            <Button onClick={checkInvite} size="lg" className="w-full" loading={checkingInvite} disabled={!inviteCode.trim()}>
              Verify Code
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Input
              label="Your Name"
              placeholder="Jane Austen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" size="lg" className="w-full mt-1" loading={loading}>
              Create Account
            </Button>
            <button
              type="button"
              className="text-sm text-stone-400 hover:text-stone-600"
              onClick={() => setStep("invite")}
            >
              ← Back to invite code
            </button>
          </form>
        )}

        <p className="text-center text-sm text-stone-500 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
