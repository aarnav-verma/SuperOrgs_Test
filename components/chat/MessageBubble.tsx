"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";

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

function parseInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    const candidates: Array<{ index: number; type: "bold" | "italic"; match: RegExpMatchArray }> = [];
    if (boldMatch?.index !== undefined) candidates.push({ index: boldMatch.index, type: "bold", match: boldMatch });
    if (italicMatch?.index !== undefined) candidates.push({ index: italicMatch.index, type: "italic", match: italicMatch });

    if (candidates.length === 0) {
      parts.push(<Fragment key={key++}>{remaining}</Fragment>);
      break;
    }

    const first = candidates.sort((a, b) => a.index - b.index)[0];

    if (first.index > 0) {
      parts.push(<Fragment key={key++}>{remaining.slice(0, first.index)}</Fragment>);
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold">{first.match[1]}</strong>);
    } else {
      parts.push(<em key={key++} className="italic">{first.match[1]}</em>);
    }

    remaining = remaining.slice(first.index + first.match[0].length);
  }

  return <>{parts}</>;
}

function parseMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={key++} className="mt-3 mb-1 text-sm font-semibold text-[var(--foreground)]">
          {parseInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={key++} className="mt-3 mb-1 text-sm font-semibold text-[var(--foreground)]">
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={key++} className="mt-3 mb-1 text-sm font-semibold text-[var(--foreground)]">
          {parseInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ") || /^\d+\.\s/.test(line)) {
      const isOrdered = /^\d+\.\s/.test(line);
      const listItems: ReactNode[] = [];

      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* ") || /^\d+\.\s/.test(lines[i]))) {
        const itemText = lines[i].replace(/^[-*]\s|^\d+\.\s/, "");
        listItems.push(
          <li key={i} className="ml-4 leading-6">
            {parseInline(itemText)}
          </li>
        );
        i++;
      }

      nodes.push(
        isOrdered
          ? <ol key={key++} className="my-1 list-decimal space-y-0.5">{listItems}</ol>
          : <ul key={key++} className="my-1 list-disc space-y-0.5">{listItems}</ul>
      );
      continue;
    }

    if (line.startsWith("|") && line.includes("|")) {
      i++;
      if (i < lines.length && /^\|[-| :]+\|$/.test(lines[i].trim())) {
        i++;
      }
      continue;
    }

    if (/^[-*]{3,}$/.test(line.trim())) {
      nodes.push(<hr key={key++} className="my-2 border-[var(--border)]" />);
      i++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    nodes.push(
      <p key={key++} className="leading-6">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return nodes;
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
            "rounded-md border px-3 py-2 text-sm",
            "transition-colors",
            "max-w-full",
            isUser
              ? "border-[var(--ink)] bg-[var(--ink)] text-white"
              : "border-[var(--border)] bg-white text-[var(--foreground)]"
          ].join(" ")}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-6">{content}</p>
          ) : (
            <div className="break-words space-y-1">
              {parseMarkdown(content)}
            </div>
          )}
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
