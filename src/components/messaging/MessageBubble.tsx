import { cn } from "@/lib/utils";

type Status = "pending" | "failed";

/** Single chat bubble. Left-aligned (other) or right-aligned (mine). */
export function MessageBubble({
  body,
  createdAt,
  mine,
  status,
}: {
  body: string;
  createdAt: string;
  mine: boolean;
  /** Optimistic-send status. Undefined = confirmed. */
  status?: Status;
}) {
  const time = new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const pending = status === "pending";
  const failed = status === "failed";

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%]", mine && "items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            mine
              ? "rounded-br-sm bg-brand-600 text-white"
              : "rounded-bl-sm border border-border bg-surface text-foreground",
            pending && "opacity-70",
            failed && "border border-danger/40 bg-danger-bg text-red-900",
          )}
        >
          {body}
        </div>
        <p
          className={cn(
            "mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted",
            mine ? "justify-end" : "justify-start",
          )}
        >
          {failed ? (
            <span className="font-medium text-danger">Failed to send</span>
          ) : pending ? (
            <span>Sending...</span>
          ) : (
            <span>{time}</span>
          )}
        </p>
      </div>
    </div>
  );
}
