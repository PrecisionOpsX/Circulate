import { cn } from "@/lib/utils";

/** Single chat bubble. Left-aligned (other) or right-aligned (mine). */
export function MessageBubble({
  body,
  createdAt,
  mine,
}: {
  body: string;
  createdAt: string;
  mine: boolean;
}) {
  const time = new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%]", mine && "items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            mine
              ? "rounded-br-sm bg-brand-600 text-white"
              : "rounded-bl-sm border border-border bg-surface text-foreground",
          )}
        >
          {body}
        </div>
        <p
          className={cn(
            "mt-1 px-1 text-[11px] text-muted",
            mine ? "text-right" : "text-left",
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
