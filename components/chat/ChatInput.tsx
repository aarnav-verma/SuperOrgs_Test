"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

type ChatInputProps = {
  disabled?: boolean;
  onSubmit: (message: string) => void;
};

export function ChatInput({ disabled = false, onSubmit }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = value.trim();
    if (!message || disabled) {
      return;
    }

    setValue("");
    onSubmit(message);
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <textarea
          aria-describedby="mission-control-input-help"
          aria-label="Message Federal AI Mission Control"
          maxLength={1200}
          ref={textareaRef}
          className={[
            "min-h-11 flex-1 resize-none rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--foreground)] shadow-sm",
            "placeholder:text-[var(--muted)]",
            "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]",
            "disabled:cursor-not-allowed disabled:bg-[var(--soft)] disabled:text-[var(--muted)]"
          ].join(" ")}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask about the federal AI portfolio, risk, COTS adoption, or cost trends..."
          rows={2}
          value={value}
        />
        <Button disabled={disabled || value.trim().length === 0} type="submit" variant="primary">
          {disabled ? "Sending" : "Send"}
        </Button>
      </div>
      <p id="mission-control-input-help" className="px-1 text-xs text-[var(--muted)]">
        Press Enter to send, Shift + Enter for a new line.
      </p>
    </form>
  );
}
