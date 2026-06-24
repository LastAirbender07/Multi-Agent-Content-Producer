import { useState, useCallback } from "react";

/**
 * Generic hook for managing an expandable/collapsible Set of IDs.
 * Same Set toggle pattern was previously copy-pasted in FileBrowser and pipeline/page.
 */
export function useExpandedSet<T>(initial?: Set<T>) {
  const [expanded, setExpanded] = useState<Set<T>>(initial ?? new Set());

  const toggle = useCallback((id: T) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  const add = useCallback((id: T) =>
    setExpanded(prev => new Set(prev).add(id)), []);

  const clear = useCallback(() =>
    setExpanded(new Set()), []);

  return { expanded, toggle, add, clear, setExpanded };
}
