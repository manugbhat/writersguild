"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Paperclip, Image as ImageIcon } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime, getFileIcon } from "@/lib/utils";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  onUpdate?: (post: Post) => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [liking, setLiking] = useState(false);
  const [authorPhotoURL, setAuthorPhotoURL] = useState(post.authorPhotoURL);

  const isLiked = user ? post.likedBy?.includes(user.uid) : false;

  useEffect(() => {
    // If post doesn't have a photoURL, try to fetch the current one from users collection
    if (!post.authorPhotoURL && post.authorId) {
      getDoc(doc(db, "users", post.authorId)).then((snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          if (userData.photoURL) {
            setAuthorPhotoURL(userData.photoURL);
          }
        }
      });
    }
  }, [post.authorId, post.authorPhotoURL]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || liking) return;
    setLiking(true);
    try {
      const postRef = doc(db, "posts", post.id);
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          likeCount: increment(-1),
        });
        onUpdate?.({ ...post, likedBy: post.likedBy.filter((id) => id !== user.uid), likeCount: post.likeCount - 1 });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          likeCount: increment(1),
        });
        onUpdate?.({ ...post, likedBy: [...(post.likedBy || []), user.uid], likeCount: post.likeCount + 1 });
      }
    } finally {
      setLiking(false);
    }
  };

  const excerpt = post.content.replace(/<[^>]*>/g, "").slice(0, 200);

  return (
    <Link href={`/post/${post.id}`}>
      <Card hover className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={post.authorName} photoURL={authorPhotoURL} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-800 truncate">{post.authorName}</span>
              <span className="text-xs text-stone-400 flex-shrink-0">{formatRelativeTime(post.createdAt)}</span>
            </div>
            <Link
              href={`/groups/${post.groupId}`}
              className="text-xs text-amber-600 font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {post.groupName}
            </Link>
          </div>
        </div>

        <div className="mt-3">
          {post.title && (
            <h3 className="font-bold text-stone-900 text-base leading-snug mb-1">{post.title}</h3>
          )}
          {excerpt && (
            <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">{excerpt}</p>
          )}
        </div>

        {post.images && post.images.length > 0 && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img src={post.images[0]} alt="post image" className="w-full h-40 object-cover" />
          </div>
        )}

        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
                <span className="text-sm">{getFileIcon(att.name)}</span>
                <span className="text-xs text-stone-600 font-medium truncate max-w-[120px]">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-stone-50">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              isLiked ? "text-rose-500" : "text-stone-400 hover:text-rose-400"
            }`}
          >
            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            <span>{post.likeCount || 0}</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-stone-400">
            <MessageCircle size={16} />
            <span>{post.commentCount || 0}</span>
          </div>
          {post.attachments?.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-stone-400 ml-auto">
              <Paperclip size={14} />
              <span>{post.attachments.length} file{post.attachments.length > 1 ? "s" : ""}</span>
            </div>
          )}
          {post.images?.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-stone-400 ml-auto">
              <ImageIcon size={14} />
              <span>{post.images.length}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
