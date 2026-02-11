"use client";

import { useState, useCallback } from "react";

interface SearchState {
  query: string;
  matchCount: number;
  currentMatch: number;
}

export function useJsonSearch(containerRef: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState<SearchState>({ query: "", matchCount: 0, currentMatch: -1 });

  const clearHighlights = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll(".jt-highlight").forEach((m) => {
      const parent = m.parentNode!;
      parent.replaceChild(document.createTextNode(m.textContent || ""), m);
      parent.normalize();
    });
  }, [containerRef]);

  const search = useCallback(
    (query: string) => {
      const container = containerRef.current;
      if (!container) return;

      clearHighlights();

      if (!query.trim()) {
        setState({ query: "", matchCount: 0, currentMatch: -1 });
        return;
      }

      const ql = query.toLowerCase();
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.textContent?.toLowerCase().includes(ql)) textNodes.push(node);
      }

      // Expand ancestor jt-nodes + wrap matches
      textNodes.forEach((node) => {
        let el = node.parentElement;
        while (el && el !== container) {
          if (el.classList.contains("jt-node")) el.classList.add("open");
          el = el.parentElement;
        }

        const text = node.textContent || "";
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        const lower = text.toLowerCase();
        let pos = lower.indexOf(ql);
        while (pos >= 0) {
          if (pos > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, pos)));
          const mark = document.createElement("mark");
          mark.className = "jt-highlight";
          mark.textContent = text.slice(pos, pos + query.length);
          frag.appendChild(mark);
          lastIdx = pos + query.length;
          pos = lower.indexOf(ql, lastIdx);
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        node.parentNode!.replaceChild(frag, node);
      });

      const allMarks = container.querySelectorAll(".jt-highlight");
      const count = allMarks.length;
      if (count > 0) {
        allMarks[0].classList.add("jt-highlight-active");
        allMarks[0].scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setState({ query, matchCount: count, currentMatch: count > 0 ? 0 : -1 });
    },
    [containerRef, clearHighlights]
  );

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const container = containerRef.current;
      if (!container) return;
      const allMarks = container.querySelectorAll(".jt-highlight");
      if (!allMarks.length) return;

      if (state.currentMatch >= 0 && state.currentMatch < allMarks.length) {
        allMarks[state.currentMatch].classList.remove("jt-highlight-active");
      }

      let next = state.currentMatch + dir;
      if (next >= allMarks.length) next = 0;
      if (next < 0) next = allMarks.length - 1;

      allMarks[next].classList.add("jt-highlight-active");
      allMarks[next].scrollIntoView({ behavior: "smooth", block: "center" });
      setState((s) => ({ ...s, currentMatch: next, matchCount: allMarks.length }));
    },
    [containerRef, state.currentMatch]
  );

  return { ...state, search, navigate, clearHighlights };
}
