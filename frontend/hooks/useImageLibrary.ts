"use client";
import { useState, useEffect } from "react";
import { api, type ImageLibraryItem } from "@/lib/api";

interface ImageLibrary {
  run_images: Record<string, ImageLibraryItem[]>;
  user_uploads: ImageLibraryItem[];
}

interface UseImageLibraryReturn {
  library: ImageLibrary | null;
  libraryLoading: boolean;
  expandedAngles: Set<string>;
  setExpandedAngles: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLibrary: React.Dispatch<React.SetStateAction<ImageLibrary | null>>;
}

export function useImageLibrary(runId: string): UseImageLibraryReturn {
  const [library, setLibrary] = useState<ImageLibrary | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [expandedAngles, setExpandedAngles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!runId) return;
    setLibraryLoading(true);
    api.getImageLibrary(runId)
      .then(lib => {
        setLibrary(lib);
        // Auto-expand first angle
        const keys = Object.keys(lib.run_images);
        if (keys.length > 0) setExpandedAngles(new Set([keys[0]]));
      })
      .catch(() => {})
      .finally(() => setLibraryLoading(false));
  }, [runId]);

  return { library, libraryLoading, expandedAngles, setExpandedAngles, setLibrary };
}
