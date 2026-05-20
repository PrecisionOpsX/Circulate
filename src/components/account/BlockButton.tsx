"use client";

import { useState, useTransition } from "react";
import { toggleBlockAction } from "@/app/users/actions";
import { cn } from "@/lib/utils";

type Props = {
  targetUserId: string;
  initialBlocked: boolean;
  className?: string;
};

/**
 * Block / unblock toggle. Optimistic local state; reverts on error.
 */
export function BlockButton({ targetUserId, initialBlocked, className }: Props) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !blocked;
    setBlocked(next);
    startTransition(async () => {
      const result = await toggleBlockAction(targetUserId);
      if (!result.ok) setBlocked(!next);
      else if (typeof result.blocked === "boolean") setBlocked(result.blocked);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-60",
        blocked
          ? "text-danger hover:text-red-700"
          : "text-muted hover:text-foreground",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6 18.4 18.4" />
      </svg>
      {pending
        ? "Working..."
        : blocked
          ? "Unblock"
          : "Block this user"}
    </button>
  );
}
