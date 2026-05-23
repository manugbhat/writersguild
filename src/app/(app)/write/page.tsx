"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TopBar } from "@/components/layout/TopBar";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Image, Paperclip, X, ChevronDown } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getFileIcon } from "@/lib/utils";
import type { Attachment } from "@/lib/types";

function WritePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const preselectedGroupId = searchParams.get("groupId") || "";
  const preselectedGroupName = searchParams.get("groupName") || "";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupId] = useState(preselectedGroupId);
  const [groupName] = useState(preselectedGroupName);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [attachments, setAttachments] = useState<{ file: File; name: string; size: number; type: string }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, { file, preview: ev.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      setAttachments((prev) => [...prev, { file, name: file.name, size: file.size, type: file.type }]);
    });
    e.target.value = "";
  };

  const canPublish = content.replace(/<[^>]*>/g, "").trim().length > 0 && groupId;

  const handlePublish = async () => {
    if (!user || !canPublish) return;
    setError("");
    setPublishing(true);
    try {
      const uploadedImages: string[] = [];
      for (const img of images) {
        const imgRef = ref(storage, `posts/${user.uid}/${uuidv4()}-${img.file.name}`);
        await uploadBytes(imgRef, img.file);
        const url = await getDownloadURL(imgRef);
        uploadedImages.push(url);
      }

      const uploadedAttachments: Attachment[] = [];
      for (const att of attachments) {
        const attRef = ref(storage, `posts/${user.uid}/${uuidv4()}-${att.file.name}`);
        await uploadBytes(attRef, att.file);
        const url = await getDownloadURL(attRef);
        uploadedAttachments.push({
          name: att.name,
          url,
          size: att.size,
          type: att.type,
        });
      }

      await addDoc(collection(db, "posts"), {
        groupId,
        groupName,
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoURL: user.photoURL || "",
        title: title.trim(),
        content,
        attachments: uploadedAttachments,
        images: uploadedImages,
        likeCount: 0,
        commentCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "groups", groupId), {
        postCount: increment(1),
      });

      router.push(`/groups/${groupId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <TopBar
        title="New Post"
        right={
          <Button
            size="sm"
            onClick={handlePublish}
            loading={publishing}
            disabled={!canPublish}
          >
            Publish
          </Button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {!groupId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Please go to a group first and tap &quot;Write&quot; to create a post in that group.
          </div>
        )}

        {groupName && (
          <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-4 py-2">
            <span className="text-sm text-stone-500">Posting to</span>
            <span className="text-sm font-semibold text-stone-800">{groupName}</span>
            <ChevronDown size={14} className="text-stone-400" />
          </div>
        )}

        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold"
        />

        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="What are you writing today? Share a story, poem, chapter, or essay..."
        />

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden">
                <img src={img.preview} alt="" className="w-full h-24 object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-col gap-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
                <span className="text-lg">{getFileIcon(att.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{att.name}</p>
                  <p className="text-xs text-stone-400">{(att.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-amber-600 transition"
          >
            <Image size={18} /> Add Image
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-amber-600 transition"
          >
            <Paperclip size={18} /> Attach File
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageAdd}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          multiple
          onChange={handleFileAdd}
          className="hidden"
        />
      </div>
    </>
  );
}

export default function WritePage() {
  return (
    <Suspense>
      <WritePageInner />
    </Suspense>
  );
}
