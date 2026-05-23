"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useState, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { PostCard } from "@/components/posts/PostCard";
import { BookOpen, Feather } from "lucide-react";
import Link from "next/link";
import type { Post } from "@/lib/types";

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.groupIds || user.groupIds.length === 0) {
      setLoading(false);
      return;
    }

    const groupChunks: string[][] = [];
    for (let i = 0; i < user.groupIds.length; i += 10) {
      groupChunks.push(user.groupIds.slice(i, i + 10));
    }

    const unsubs: (() => void)[] = [];
    const allPosts: Record<string, Post> = {};

    groupChunks.forEach((chunk) => {
      const q = query(
        collection(db, "posts"),
        where("groupId", "in", chunk),
        orderBy("createdAt", "desc"),
        limit(30)
      );
      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => {
          allPosts[d.id] = { id: d.id, ...d.data() } as Post;
        });
        const sorted = Object.values(allPosts).sort(
          (a, b) =>
            (b.createdAt as { seconds: number }).seconds -
            (a.createdAt as { seconds: number }).seconds
        );
        setPosts(sorted);
        setLoading(false);
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [user?.groupIds?.join(",")]);

  const handlePostUpdate = useCallback((updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  return (
    <>
      <TopBar
        title="WritersGuild"
        subtitle="Your reading feed"
        right={
          <Link href="/write">
            <div className="flex items-center gap-1.5 bg-amber-600 text-white rounded-xl px-3 py-2 text-sm font-semibold">
              <Feather size={14} />
              Write
            </div>
          </Link>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-stone-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-stone-200 rounded w-1/3" />
                  <div className="h-3 bg-stone-100 rounded w-1/4" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded" />
                <div className="h-3 bg-stone-100 rounded w-5/6" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
              <BookOpen size={32} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-stone-700">Your feed is empty</p>
              <p className="text-sm text-stone-400 mt-1">
                {!user?.groupIds?.length
                  ? "Join a group to see posts from writers"
                  : "No posts yet in your groups. Be the first to write!"}
              </p>
            </div>
            {!user?.groupIds?.length && (
              <Link
                href="/groups"
                className="bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Explore Groups
              </Link>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
          ))
        )}
      </div>
    </>
  );
}
