"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BookOpen, ChevronRight, Check } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { firebaseUser, refreshUser } = useAuth();
  const [step, setStep] = useState<"invite" | "account">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const checkInvite = async () => {
    setInviteError("");
    setCheckingInvite(true);
    try {
      const codeRef = doc(db, "inviteCodes", inviteCode.trim().toUpperCase());
      const snap = await getDoc(codeRef);
      if (!snap.exists()) {
        setInviteError("Invalid invite code.");
        return;
      }
      if (snap.data().used) {
        setInviteError("This invite code has already been used.");
        return;
      }

      // If user is already authenticated via Google (orphan from login flow),
      // auto-create their Firestore doc and skip the email/password form.
      if (firebaseUser) {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          displayName: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          bio: "",
          groupIds: [],
          createdAt: serverTimestamp(),
        });
        await updateDoc(codeRef, {
          used: true,
          usedBy: firebaseUser.uid,
        });
        await refreshUser();
        router.push("/feed");
        return;
      }

      setStep("account");
    } catch {
      setInviteError("Failed to verify invite code. Try again.");
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      // Validate invite code before proceeding with Google auth
      const codeRef = doc(db, "inviteCodes", inviteCode.trim().toUpperCase());
      const snap = await getDoc(codeRef);
      if (!snap.exists()) {
        setError("Invalid invite code. Please verify your code first.");
        setGoogleLoading(false);
        return;
      } else if (snap.data().used) {
        setError("This invite code has already been used.");
        setGoogleLoading(false);
        return;
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { user } = result;

      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        bio: "",
        groupIds: [],
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "inviteCodes", inviteCode.trim().toUpperCase()), {
        used: true,
        usedBy: user.uid,
      });

      router.push("/feed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) {
        setError("");
      } else {
        setError("Google sign-up failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
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
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400">or</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleGoogleSignup}
              loading={googleLoading}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
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
