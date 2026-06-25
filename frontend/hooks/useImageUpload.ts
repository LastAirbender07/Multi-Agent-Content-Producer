"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { api, type ImageLibraryItem } from "@/lib/api";

interface UseImageUploadReturn {
  getRootProps: ReturnType<typeof useDropzone>["getRootProps"];
  getInputProps: ReturnType<typeof useDropzone>["getInputProps"];
  isDragActive: boolean;
  uploading: boolean;
  uploadError: string | null;
  onUploadComplete: (item: ImageLibraryItem) => void;
}

export function useImageUpload(
  onUploadComplete: (item: ImageLibraryItem) => void,
): Omit<UseImageUploadReturn, "onUploadComplete"> {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted[0]) return;
    setUploading(true);
    setUploadError(null);
    try {
      const item = await api.uploadToLibrary(accepted[0]);
      onUploadComplete(item);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  return { getRootProps, getInputProps, isDragActive, uploading, uploadError };
}
