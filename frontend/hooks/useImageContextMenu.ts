"use client";
import { useState, useEffect, useRef } from "react";
import type { ImageLibraryItem } from "@/lib/api";

interface ContextMenuState {
  item: ImageLibraryItem;
  x: number;
  y: number;
}

interface UseImageContextMenuReturn {
  contextMenu: ContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  handleRightClick: (e: React.MouseEvent, item: ImageLibraryItem) => void;
}

export function useImageContextMenu(): UseImageContextMenuReturn {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    if (contextMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  function handleRightClick(e: React.MouseEvent, item: ImageLibraryItem) {
    e.preventDefault();
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  }

  return { contextMenu, setContextMenu, contextMenuRef, handleRightClick };
}
