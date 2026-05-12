"use client";

type MessageBubbleProps = {
  role: string;
  content: string;
  streaming?: boolean;
  createdAt?: string;
};

function formatTime(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function MessageBubble({ content, role, streaming = false, createdAt }: MessageBubbleProps) {
  const isUser = role === "user";
  const actor = isUser ? "You" : "Mission Control";
  const timeLabel = formatTime(createdAt);

  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div className="max-w-[84%]">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          <span>{actor}</span>
          {timeLabel ? <span className="ml-2 font-normal normal-case">• {timeLabel}</span> : null}
        </p>
        <article
          className={[
            "rounded-md border px-3 py-2 text-sm leading-6",
            "transition-colors",
            "max-w-full whitespace-pre-wrap",
            isUser
              ? "border-[var(--ink)] bg-[var(--ink)] text-white"
              : "border-[var(--border)] bg-white text-[var(--foreground)]"
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
          {streaming ? (
            <span
              aria-hidden="true"
              className="mt-2 inline-flex items-center gap-1 text-[var(--accent)]"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                style={{ animationDelay: "140ms" }}
              />
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                style={{ animationDelay: "280ms" }}
              />
            </span>
          ) : null}
        </article>
      </div>
    </div>
  );
}
