"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { MessageState } from "@/app/messages/actions";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { MESSAGE_MAX_LENGTH } from "@/lib/validation";

type Props = {
  /** Send handler provided by ConversationThread, which manages the
   *  optimistic-state lifecycle. Returns the action result. */
  onSend: (body: string) => Promise<MessageState>;
};

/**
 * Compose + send a message. Enter (without Shift) submits;
 * Shift+Enter inserts a newline. The textarea clears as soon as the
 * send is dispatched (the optimistic bubble already represents what
 * was typed) so the user can keep typing.
 */
export function MessageInput({ onSend }: Props) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(): Promise<void> {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    if (trimmed.length > MESSAGE_MAX_LENGTH) return;

    setPending(true);
    setError(null);
    // Clear the input immediately so the user can keep typing while the
    // network round-trip happens; the optimistic bubble already shows
    // what was sent.
    setBody("");
    const result = await onSend(trimmed);
    setPending(false);
    if (!result.ok && result.error) {
      setError(result.error);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const tooLong = body.length > MESSAGE_MAX_LENGTH;
  const canSend = body.trim().length > 0 && !tooLong && !pending;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-2 border-t border-border bg-surface p-3 sm:p-4"
    >
      <div className="flex items-end gap-2">
        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={MESSAGE_MAX_LENGTH + 100}
          placeholder="Write a message..."
          className="resize-none"
          aria-label="Message"
        />
        <Button type="submit" disabled={!canSend} variant="gradient">
          Send
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {tooLong && (
        <p className="text-xs text-danger">
          Message too long ({body.length} of {MESSAGE_MAX_LENGTH} characters).
        </p>
      )}
    </form>
  );
}
