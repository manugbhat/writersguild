import type { DocCommentStatus } from "@/lib/types";

export interface HighlightRange {
  id: string;
  startOffset: number;
  endOffset: number;
  status: DocCommentStatus;
}

export interface SelectionOffsets {
  startOffset: number;
  endOffset: number;
  quote: string;
}

/**
 * Returns the character offset of (node, offset) relative to the start of the
 * container, measured against the container's rendered text content. Uses a DOM
 * Range so it works uniformly for both text nodes and element nodes.
 */
function getGlobalOffset(container: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(container, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * Reads the current window selection and converts it to character offsets within
 * the given container. Returns null when there is no usable text selection.
 */
export function getSelectionOffsets(container: HTMLElement): SelectionOffsets | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  const a = getGlobalOffset(container, range.startContainer, range.startOffset);
  const b = getGlobalOffset(container, range.endContainer, range.endOffset);

  const startOffset = Math.min(a, b);
  const endOffset = Math.max(a, b);
  const quote = sel.toString().trim();

  if (startOffset === endOffset || quote.length === 0) return null;

  return { startOffset, endOffset, quote };
}

function highlightClassName(status: DocCommentStatus, active: boolean): string {
  const base = "wg-doc-highlight cursor-pointer rounded-sm transition-colors";
  const ring = active ? " ring-2 ring-offset-1" : "";
  if (status === "approved") {
    return `${base} bg-emerald-200/70 hover:bg-emerald-300/80${active ? ring + " ring-emerald-400" : ""}`;
  }
  if (status === "invalid") {
    return `${base} bg-stone-200/70 text-stone-400 line-through hover:bg-stone-300/70${active ? ring + " ring-stone-400" : ""}`;
  }
  return `${base} bg-amber-200/70 hover:bg-amber-300/80${active ? ring + " ring-amber-400" : ""}`;
}

interface TextNodeInfo {
  node: Text;
  start: number;
  end: number;
}

function collectTextNodes(container: HTMLElement): TextNodeInfo[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: TextNodeInfo[] = [];
  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    const len = text.nodeValue?.length ?? 0;
    nodes.push({ node: text, start: offset, end: offset + len });
    offset += len;
    current = walker.nextNode();
  }
  return nodes;
}

/**
 * Wraps the given offset ranges in <mark> elements inside the container.
 * The container's innerHTML must already be reset to the clean rendered document
 * before calling this, since wrapping mutates the DOM. A highlight that spans
 * multiple text nodes produces multiple <mark> elements sharing the same id.
 */
export function applyHighlights(
  container: HTMLElement,
  highlights: HighlightRange[],
  activeId?: string | null,
): void {
  if (highlights.length === 0) return;
  const textNodes = collectTextNodes(container);

  // Walk in reverse so DOM mutations don't invalidate earlier node references.
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const { node, start, end } = textNodes[i];
    const text = node.nodeValue ?? "";

    const segments: { s: number; e: number; h: HighlightRange }[] = [];
    for (const h of highlights) {
      const s = Math.max(h.startOffset, start);
      const e = Math.min(h.endOffset, end);
      if (s < e) segments.push({ s: s - start, e: e - start, h });
    }
    if (segments.length === 0) continue;

    segments.sort((a, b) => a.s - b.s);

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const seg of segments) {
      const segStart = Math.max(seg.s, cursor);
      if (segStart >= seg.e) continue;
      if (segStart > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, segStart)));
      }
      const mark = document.createElement("mark");
      mark.setAttribute("data-comment-id", seg.h.id);
      mark.className = highlightClassName(seg.h.status, seg.h.id === activeId);
      mark.textContent = text.slice(segStart, seg.e);
      frag.appendChild(mark);
      cursor = seg.e;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode?.replaceChild(frag, node);
  }
}
