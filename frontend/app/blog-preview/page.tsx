"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function Redirector() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const runId = params.get("run_id");
    const topic = params.get("topic") ?? "";
    const dest = runId
      ? `/editor?run=${runId}&view=blog${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`
      : "/editor";
    router.replace(dest);
  }, []);
  return null;
}

export default function BlogPreviewPage() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}
