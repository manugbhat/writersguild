"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, arrayUnion, arrayRemove,
  increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Heart, Send, Paperclip, Download } from "lucide-react";
import { formatRelativeTime, formatDate, getFileIcon } from "@/lib/utils";
import type { Post, Comment } from "@/lib/types";

interface CommentWithPhoto extends Comment {
  currentPhotoURL?: string;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [authorPhotoURL, setAuthorPhotoURL] = useState<string | undefined>();
  const commentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDoc(doc(db, "posts", id)).then((snap) => {
      if (snap.exists()) {
        const postData = { id: snap.id, ...snap.data() } as Post;
        setPost(postData);
        setAuthorPhotoURL(postData.authorPhotoURL);
        // If post doesn't have a photoURL, fetch current one from users collection
        if (!postData.authorPhotoURL && postData.authorId) {
          getDoc(doc(db, "users", postData.authorId)).then((userSnap) => {
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.photoURL) {
                setAuthorPhotoURL(userData.photoURL);
              }
            }
          });
        }
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("postId", "==", id),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
      const commentsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommentWithPhoto);
      setComments(commentsData);

      // Fetch current photoURLs for comments that don't have one
      commentsData.forEach((comment) => {
        if (!comment.authorPhotoURL && comment.authorId) {
          getDoc(doc(db, "users", comment.authorId)).then((userSnap) => {
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.photoURL) {
                setComments((prev) =>
                  prev.map((c) =>
                    c.id === comment.id ? { ...c, currentPhotoURL: userData.photoURL } : c
                  )
                );
              }
            }
          });
        }
      });
    }, (error) => {
      console.error("Comments snapshot error:", error.message);
    });
  }, [id]);

  const isLiked = user && post?.likedBy?.includes(user.uid);

  const handleLike = async () => {
    if (!user || !post || liking) return;
    setLiking(true);
    try {
      const postRef = doc(db, "posts", post.id);
      if (isLiked) {
        await updateDoc(postRef, { likedBy: arrayRemove(user.uid), likeCount: increment(-1) });
        setPost((p) => p ? { ...p, likedBy: p.likedBy.filter((u) => u !== user.uid), likeCount: p.likeCount - 1 } : p);
      } else {
        await updateDoc(postRef, { likedBy: arrayUnion(user.uid), likeCount: increment(1) });
        setPost((p) => p ? { ...p, likedBy: [...p.likedBy, user.uid], likeCount: p.likeCount + 1 } : p);
      }
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post || !comment.trim()) return;
    setSubmitting(true);
    try {
      // Add optimistic update to show comment immediately
      const tempComment: Comment = {
        id: `temp-${Date.now()}`,
        postId: post.id,
        authorId: user.uid,
        authorName: user.displayName || "",
        authorPhotoURL: user.photoURL || "",
        content: comment.trim(),
        createdAt: new Date(),
      };
      setComments((prev) => [...prev, tempComment]);
      setComment("");

      await addDoc(collection(db, "comments"), {
        postId: post.id,
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoURL: user.photoURL || "",
        content: comment.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), { commentCount: increment(1) });
      setPost((p) => p ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p);
    } catch (error) {
      console.error("Failed to add comment:", error);
      // Revert optimistic update on error
      setComments((prev) => prev.filter((c) => !c.id.startsWith("temp-")));
      setComment(comment);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return <div className="flex justify-center py-20 text-stone-500">Post not found.</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-full text-stone-500 hover:bg-stone-100 transition"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate">{post.groupName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto w-full">
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={post.authorName} photoURL={authorPhotoURL} size="md" />
          <div>
            <p className="font-semibold text-stone-900">{post.authorName}</p>
            <p className="text-xs text-stone-400">{formatDate(post.createdAt)}</p>
          </div>
        </div>

        {post.title && (
          <h1 className="text-2xl font-bold text-stone-900 leading-tight mb-4">{post.title}</h1>
        )}

        <div
          className="prose prose-stone prose-sm max-w-none text-stone-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.images && post.images.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3">
            {post.images.map((url, i) => (
              <img key={i} src={url} alt="" className="rounded-xl w-full object-cover max-h-80" />
            ))}
          </div>
        )}

        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Attachments</p>
            {post.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 hover:bg-stone-100 transition"
              >
                <span className="text-2xl">{getFileIcon(att.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{att.name}</p>
                  <p className="text-xs text-stone-400">{(att.size / 1024).toFixed(1)} KB</p>
                </div>
                <Download size={16} className="text-stone-400" />
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-stone-100">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition-colors ${
              isLiked ? "text-rose-500" : "text-stone-400 hover:text-rose-400"
            }`}
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            <span className="text-sm font-medium">{post.likeCount || 0}</span>
          </button>
          <button
            onClick={() => commentRef.current?.focus()}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition"
          >
            <span className="text-sm font-medium">{comments.length} comments</span>
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 max-w-lg mx-auto w-full">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Comments</p>
        <div className="flex flex-col gap-4 mb-4">
          {comments.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">No comments yet. Start the conversation!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.authorName} photoURL={c.currentPhotoURL || c.authorPhotoURL} size="sm" />
                <div className="flex-1 bg-stone-50 rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-stone-700">{c.authorName}</span>
                    <span className="text-xs text-stone-400">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {user && (
          <form onSubmit={handleComment} className="flex items-center gap-2 sticky bottom-20">
            <Avatar name={user.displayName} photoURL={user.photoURL} size="sm" />
            <div className="flex-1 flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2">
              <input
                ref={commentRef}
                type="text"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!comment.trim() || submitting}
                className="text-amber-600 disabled:text-stone-300 transition"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
