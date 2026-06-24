"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function useBlankRunCreation(): {
  createRun: (title: string, redirectPath?: string) => Promise<string | null>;
  loading: boolean;
  error: string | null;
} {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRun(title: string, redirectPath?: string): Promise<string | null> {
    setLoading(true);
    setError(null);
    try {
      const { run_id } = await api.createBlankRun(title.trim() || "Untitled");
      if (redirectPath) {
        router.push(redirectPath.replace("{run_id}", run_id));
      }
      return run_id;
    } catch (e: any) {
      setError(e?.message ?? "Failed to create run");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createRun, loading, error };
}
