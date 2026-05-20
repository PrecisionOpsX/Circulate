"use client";

import { useActionState, useRef, useState, type KeyboardEvent } from "react";
import {
  sendMessageAction,
  type MessageState,
} from "@/app/messages/actions";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { MESSAGE_MAX_LENGTH } from "@/lib/validation";

const initial: MessageState = { ok: false };

/**
 * Compose + send a message. Cmd/Ctrl+Enter and plain Enter (without
 * Shift) submit; Shift+Enter inserts a newline.
 */
export function MessageInput({
  conversationId,
}: {
  conversationId: string;
}) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState(
    sendMessageAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Adjust state during render: when the action succeeds, clear the input.
  const [lastAckId, setLastAckId] = useState(0);
  const ackId = state.ok ? 1 : 0;
  if (lastAckId !== ackId) {
    setLastAckId(ackId);
    if (state.ok) setBody("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!body.trim() || pending) return;
      formRef.current?.requestSubmit();
    }
  }

  const tooLong = body.length > MESSAGE_MAX_LENGTH;
  const canSend = body.trim().length > 0 && !tooLong && !pending;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-2 border-t border-border bg-surface p-3 sm:p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
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
          required
        />
        <Button type="submit" disabled={!canSend} variant="gradient">
          {pending ? "Sending..." : "Send"}
        </Button>
      </div>
      {state.error && !pending && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {tooLong && (
        <p className="text-xs text-danger">
          Message too long ({body.length} of {MESSAGE_MAX_LENGTH} characters).
        </p>
      )}
    </form>
  );
}
