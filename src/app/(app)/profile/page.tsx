"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PostCard } from "@/components/posts/PostCard";
import { Settings, LogOut, FileText, Camera } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/lib/types";

export default function ProfilePage() {
  const { user, signOut, refreshUser, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  console.log("[ProfilePage] user:", user, "authLoading:", authLoading);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "posts"),
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q).then((snap) => {
      console.log("Profile posts query result:", snap.size, "posts");
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));
      setLoadingPosts(false);
    }).catch((error) => {
      console.error("Failed to fetch user posts:", error);
      setLoadingPosts(false);
    });
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: editName.trim(),
        bio: editBio.trim(),
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() });
      }
      await refreshUser();
      setShowEdit(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoUploading(true);
    try {
      console.log("Uploading photo for user:", user.uid);
      const photoRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      console.log("Photo uploaded, URL:", url);
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }
      await refreshUser();
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  if (authLoading) {
    console.log("[ProfilePage] Auth still loading, showing spinner");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.log("[ProfilePage] No user after loading, returning null");
    return null;
  }

  return (
    <>
      <TopBar
        title="Profile"
        right={
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut size={16} /> Sign Out
          </Button>
        }
      />

      <div className="px-4 py-6">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative">
            <Avatar name={user.displayName} photoURL={user.photoURL} size="lg" />
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center cursor-pointer shadow-md">
              {photoUploading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={12} className="text-white" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-stone-900">{user.displayName}</h2>
            <p className="text-sm text-stone-500">{user.email}</p>
            {user.bio && <p className="text-sm text-stone-600 mt-2 max-w-xs">{user.bio}</p>}
            <p className="text-xs text-stone-400 mt-1">Member since {formatDate(user.createdAt)}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setEditName(user.displayName); setEditBio(user.bio || ""); setShowEdit(true); }}>
            <Settings size={14} /> Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-stone-100 p-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{posts.length}</p>
            <p className="text-xs text-stone-500 mt-0.5">Posts</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 p-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{user.groupIds?.length || 0}</p>
            <p className="text-xs text-stone-500 mt-0.5">Groups</p>
          </div>
        </div>

        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileText size={14} /> My Posts
        </p>

        {loadingPosts ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-stone-100" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">No posts yet. Start writing!</p>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Profile">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Display Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Textarea
            label="Bio"
            placeholder="Tell the guild about yourself..."
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSaveProfile} loading={saving} size="lg" className="w-full">
            Save Changes
          </Button>
        </div>
      </Modal>
    </>
  );
}
