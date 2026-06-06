"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DocumentReviewer } from "@/components/documents/DocumentReviewer";
import { getFileIcon } from "@/lib/utils";
import { ChevronLeft, Download, AlertCircle } from "lucide-react";
import type { Post } from "@/lib/types";

function isDocx(name: string) {
  return /\.docx?$/i.test(name);
}

function ReviewInner() {
  const { postId } = useParams<{ postId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileIndex = Number(searchParams.get("file") ?? "0");

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "posts", postId)).then((snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() } as Post);
      setLoading(false);
    });
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const file = post?.attachments?.[fileIndex];

  if (!post || !file) {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-center text-stone-500">
        <AlertCircle size={24} className="text-rose-400" />
        <p className="text-sm">Document not found.</p>
        <button onClick={() => router.back()} className="text-sm font-medium text-amber-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
          title="Back to post"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg">{getFileIcon(file.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800">{file.name}</p>
          <p className="truncate text-xs text-stone-400">Reviewing in {post.groupName}</p>
        </div>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100"
        >
          <Download size={16} /> <span className="hidden sm:inline">Download</span>
        </a>
      </header>

      {!isDocx(file.name) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-stone-500">
          <AlertCircle size={24} className="text-amber-400" />
          <p className="max-w-sm text-sm">
            In-app review currently supports <strong>.docx</strong> documents only. Download this file to view it.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <DocumentReviewer
            postId={postId}
            postAuthorId={post.authorId}
            fileIndex={fileIndex}
            file={file}
          />
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewInner />
    </Suspense>
  );
}
