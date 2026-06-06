"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";
import {
  applyHighlights, getSelectionOffsets,
  type HighlightRange, type SelectionOffsets,
} from "@/lib/docHighlight";
import type { Attachment, DocComment, DocCommentStatus } from "@/lib/types";
import {
  Check, X, MessageSquarePlus, Trash2, RotateCcw, AlertCircle, Loader2,
} from "lucide-react";

interface DocumentReviewerProps {
  postId: string;
  postAuthorId: string;
  fileIndex: number;
  file: Attachment;
}

interface PendingSelection extends SelectionOffsets {
  top: number;
  left: number;
}

const STATUS_LABEL: Record<DocCommentStatus, string> = {
  open: "Open",
  approved: "Approved",
  invalid: "Invalid",
};

const STATUS_BADGE: Record<DocCommentStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  invalid: "bg-stone-200 text-stone-500",
};

export function DocumentReviewer({ postId, postAuthorId, fileIndex, file }: DocumentReviewerProps) {
  const { user } = useAuth();
  const docRef = useRef<HTMLDivElement>(null);
  const rawHtmlRef = useRef<string>("");

  const [loadingDoc, setLoadingDoc] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [comments, setComments] = useState<DocComment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | DocCommentStatus>("all");

  const isPostAuthor = user?.uid === postAuthorId;

  // Load and convert the DOCX file to HTML.
  useEffect(() => {
    let cancelled = false;
    setLoadingDoc(true);
    setDocError(null);

    (async () => {
      try {
        const mammoth = (await import("mammoth/mammoth.browser")).default;
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`Failed to download document (${res.status})`);
        const arrayBuffer = await res.arrayBuffer();
        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        if (cancelled) return;
        rawHtmlRef.current = value || "<p>(Empty document)</p>";
        setLoadingDoc(false);
      } catch (err) {
        console.error("[DocumentReviewer] convert error", err);
        if (!cancelled) {
          setDocError("Could not render this document. It may not be a valid .docx file.");
          setLoadingDoc(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [file.url]);

  // Subscribe to this file's highlight comments.
  useEffect(() => {
    const q = query(
      collection(db, "docComments"),
      where("postId", "==", postId),
      where("fileIndex", "==", fileIndex),
    );
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocComment);
      items.sort((a, b) => a.startOffset - b.startOffset);
      setComments(items);
    }, (err) => console.error("[DocumentReviewer] comments snapshot", err));
  }, [postId, fileIndex]);

  const highlightRanges: HighlightRange[] = useMemo(
    () => comments.map((c) => ({
      id: c.id,
      startOffset: c.startOffset,
      endOffset: c.endOffset,
      status: c.status,
    })),
    [comments],
  );

  // Render the clean document then paint highlights on top.
  useEffect(() => {
    const container = docRef.current;
    if (!container || loadingDoc || docError) return;
    container.innerHTML = rawHtmlRef.current;
    applyHighlights(container, highlightRanges, activeId);
  }, [loadingDoc, docError, highlightRanges, activeId]);

  // Clicking a highlight selects the matching comment.
  useEffect(() => {
    const container = docRef.current;
    if (!container) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.("mark[data-comment-id]");
      if (target) {
        const id = target.getAttribute("data-comment-id");
        if (id) {
          setActiveId(id);
          document.getElementById(`comment-card-${id}`)?.scrollIntoView({
            behavior: "smooth", block: "center",
          });
        }
      }
    };
    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, [loadingDoc, docError]);

  const handleMouseUp = useCallback(() => {
    const container = docRef.current;
    if (!container) return;
    const offsets = getSelectionOffsets(container);
    if (!offsets) {
      setPending(null);
      return;
    }
    const sel = window.getSelection();
    const rect = sel && sel.rangeCount > 0
      ? sel.getRangeAt(0).getBoundingClientRect()
      : null;
    if (!rect) return;
    setPending({
      ...offsets,
      top: rect.bottom + 8,
      left: Math.max(12, rect.left),
    });
    setDraft("");
  }, []);

  const submitComment = async () => {
    if (!user || !pending || !draft.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "docComments"), {
        postId,
        fileIndex,
        fileName: file.name,
        quote: pending.quote.slice(0, 2000),
        startOffset: pending.startOffset,
        endOffset: pending.endOffset,
        content: draft.trim(),
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || "",
        status: "open" as DocCommentStatus,
        resolvedById: null,
        resolvedByName: null,
        resolvedAt: null,
        createdAt: serverTimestamp(),
      });
      setPending(null);
      setDraft("");
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error("[DocumentReviewer] add comment", err);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (c: DocComment, status: DocCommentStatus) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "docComments", c.id), {
        status,
        resolvedById: status === "open" ? null : user.uid,
        resolvedByName: status === "open" ? null : (user.displayName || "Anonymous"),
        resolvedAt: status === "open" ? null : serverTimestamp(),
      });
    } catch (err) {
      console.error("[DocumentReviewer] set status", err);
    }
  };

  const removeComment = async (c: DocComment) => {
    if (!user || c.authorId !== user.uid) return;
    try {
      await deleteDoc(doc(db, "docComments", c.id));
      if (activeId === c.id) setActiveId(null);
    } catch (err) {
      console.error("[DocumentReviewer] delete", err);
    }
  };

  const visibleComments = comments.filter((c) => filter === "all" || c.status === filter);
  const counts = useMemo(() => ({
    all: comments.length,
    open: comments.filter((c) => c.status === "open").length,
    approved: comments.filter((c) => c.status === "approved").length,
    invalid: comments.filter((c) => c.status === "invalid").length,
  }), [comments]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* Document pane */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-stone-100 px-4 py-6 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
          {loadingDoc ? (
            <div className="flex items-center justify-center gap-2 py-32 text-stone-400">
              <Loader2 size={18} className="animate-spin" /> Rendering document...
            </div>
          ) : docError ? (
            <div className="flex flex-col items-center gap-2 py-32 text-center text-stone-500">
              <AlertCircle size={24} className="text-rose-400" />
              <p className="text-sm">{docError}</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-amber-600 hover:underline">
                Download original instead
              </a>
            </div>
          ) : (
            <div
              ref={docRef}
              onMouseUp={handleMouseUp}
              className="wg-doc prose prose-stone max-w-none px-8 py-10 leading-relaxed selection:bg-amber-300/40"
            />
          )}
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-stone-400">
          Select any text to leave a comment. Highlights are colored by status.
        </p>
      </div>

      {/* Comments sidebar */}
      <aside className="w-full lg:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-stone-200 bg-white flex flex-col">
        <div className="border-b border-stone-100 px-4 py-3">
          <h2 className="text-sm font-bold text-stone-800">Comments</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["all", "open", "approved", "invalid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  filter === f
                    ? "bg-stone-800 text-white"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {f === "all" ? "All" : STATUS_LABEL[f]} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {visibleComments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-stone-400">
              <MessageSquarePlus size={22} />
              <p className="text-sm">No comments {filter !== "all" ? `(${STATUS_LABEL[filter as DocCommentStatus].toLowerCase()})` : "yet"}.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleComments.map((c) => {
                const canMarkInvalid = isPostAuthor && c.status !== "invalid";
                const canApprove = c.status !== "approved";
                const isMine = user?.uid === c.authorId;
                return (
                  <li
                    key={c.id}
                    id={`comment-card-${c.id}`}
                    onClick={() => {
                      setActiveId(c.id);
                      docRef.current
                        ?.querySelector(`mark[data-comment-id="${c.id}"]`)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      activeId === c.id
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={c.authorName} photoURL={c.authorPhotoURL} size="xs" />
                        <span className="truncate text-xs font-semibold text-stone-700">{c.authorName}</span>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>

                    <blockquote className="mt-2 border-l-2 border-amber-300 pl-2 text-xs italic text-stone-500 line-clamp-3">
                      &ldquo;{c.quote}&rdquo;
                    </blockquote>

                    <p className="mt-2 text-sm text-stone-700 leading-relaxed">{c.content}</p>

                    <div className="mt-1 text-[10px] text-stone-400">
                      {formatRelativeTime(c.createdAt)}
                      {c.resolvedByName && c.status !== "open" && (
                        <> · {c.status === "approved" ? "approved" : "marked invalid"} by {c.resolvedByName}</>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {canApprove && (
                        <button
                          onClick={() => setStatus(c, "approved")}
                          className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <Check size={13} /> Approve
                        </button>
                      )}
                      {canMarkInvalid && (
                        <button
                          onClick={() => setStatus(c, "invalid")}
                          className="flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200"
                        >
                          <X size={13} /> Mark invalid
                        </button>
                      )}
                      {c.status !== "open" && (
                        <button
                          onClick={() => setStatus(c, "open")}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
                        >
                          <RotateCcw size={13} /> Reopen
                        </button>
                      )}
                      {isMine && (
                        <button
                          onClick={() => removeComment(c)}
                          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Floating compose popover */}
      {pending && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setPending(null)} />
          <div
            className="fixed z-50 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl"
            style={{ top: pending.top, left: pending.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <blockquote className="mb-2 max-h-16 overflow-y-auto border-l-2 border-amber-300 pl-2 text-xs italic text-stone-500">
              &ldquo;{pending.quote}&rdquo;
            </blockquote>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add your comment..."
              rows={3}
              className="w-full resize-none rounded-lg border border-stone-200 px-2.5 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
                if (e.key === "Escape") setPending(null);
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <Button size="sm" onClick={submitComment} loading={saving} disabled={!draft.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
