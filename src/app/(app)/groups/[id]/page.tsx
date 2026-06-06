"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PostCard } from "@/components/posts/PostCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ChevronLeft, Users, PenLine, Copy, Check, Lock } from "lucide-react";
import type { Group, Post } from "@/lib/types";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    getDoc(doc(db, "groups", id)).then((snap) => {
      if (snap.exists()) setGroup({ id: snap.id, ...snap.data() } as Group);
      setLoadingGroup(false);
    });
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("groupId", "==", id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));
      setLoadingPosts(false);
    });
    return unsub;
  }, [id]);

  const isMember = user && group?.memberIds?.includes(user.uid);

  const handleJoin = async () => {
    if (!user || !group) return;
    setJoinError("");
    if (joinCode.trim().toUpperCase() !== group.inviteCode) {
      setJoinError("Invalid invite code for this group.");
      return;
    }
    setJoining(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        memberIds: arrayUnion(user.uid),
      });
      await updateDoc(doc(db, "users", user.uid), {
        groupIds: arrayUnion(group.id),
      });
      await refreshUser();
      setGroup((g) => g ? { ...g, memberIds: [...g.memberIds, user.uid] } : g);
      setShowJoinModal(false);
      setJoinCode("");
    } catch {
      setJoinError("Failed to join group. Try again.");
    } finally {
      setJoining(false);
    }
  };

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostUpdate = useCallback((updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  if (loadingGroup) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <p className="text-stone-500">Group not found.</p>
        <Button variant="secondary" onClick={() => router.push("/groups")}>Back to Groups</Button>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-gradient-to-r ${group.coverColor} h-16 relative`}>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-stone-500 mt-1">{group.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <Users size={12} /> {group.memberIds?.length || 0} members
                </span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs text-stone-400">{posts.length} posts</span>
              </div>
            </div>
            {isMember ? (
              <div className="flex flex-col gap-2 items-end">
                <Link href={`/write?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`}>
                  <Button size="sm">
                    <PenLine size={14} /> Write
                  </Button>
                </Link>
                {user.uid === group.createdBy && (
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 hover:bg-amber-100 transition"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : `Invite: ${group.inviteCode}`}
                  </button>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={() => { setJoinError(""); setJoinCode(""); setShowJoinModal(true); }}>
                Join Group
              </Button>
            )}
          </div>

          {group.memberIds && group.memberIds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-50 flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {group.memberIds.slice(0, 5).map((uid) => (
                  <div key={uid} className="w-6 h-6 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center text-xs font-bold text-stone-500">
                    ?
                  </div>
                ))}
              </div>
              <span className="text-xs text-stone-400 ml-1">
                {group.memberIds.length} member{group.memberIds.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {!isMember ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center">
              <Lock size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-500 text-sm">Join this group to see and share posts</p>
          </div>
        ) : loadingPosts ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-stone-100" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <p className="text-stone-500">No posts yet.</p>
            <Link href={`/write?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`}>
              <Button>
                <PenLine size={16} /> Write the first post
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
            ))}
          </div>
        )}
      </div>

      <Modal open={showJoinModal} onClose={() => setShowJoinModal(false)} title={`Join ${group.name}`}>
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Group Invite Code"
            placeholder="e.g. A1B2C3D4"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            error={joinError}
            className="uppercase tracking-widest"
          />
          <p className="text-sm text-stone-500">
            Ask the group admin for the invite code to join this group.
          </p>
          <Button onClick={handleJoin} loading={joining} disabled={!joinCode.trim()} size="lg" className="w-full">
            Join Group
          </Button>
        </div>
      </Modal>
    </>
  );
}
