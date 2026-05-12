"use client";
import { useEffect, useState } from "react";

const modes = [
  { anchor: "#mission-control", label: "Mission Control" },
  { anchor: "#inventory", label: "Inventory" },
  { anchor: "#governance-risk", label: "Governance Risk" },
  { anchor: "#cots", label: "COTS Adoption" },
  { anchor: "#cost-intelligence", label: "Cost Intelligence" }
];

const modeAnchors = modes.map(({ anchor }) => anchor);

function getAnchorFromHash(hash: string) {
  const match = modeAnchors.includes(hash)
    ? hash
    : modes[0].anchor;

  return match.replace("#", "");
}

function getActiveAnchorFromScroll() {
  if (typeof document === "undefined") {
    return getAnchorFromHash("#mission-control");
  }

  const currentHash = getAnchorFromHash(window.location.hash);
  let bestMatch = currentHash;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const mode of modes) {
    const element = document.getElementById(mode.anchor.substring(1));
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    const distance = Math.abs(rect.top);
    if (rect.top <= window.innerHeight * 0.5 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = mode.anchor.substring(1);
    }
  }

  return bestMatch;
}

export function LeftSidebar() {
  const [activeMode, setActiveMode] = useState("mission-control");

  useEffect(() => {
    const syncActiveMode = () => {
      setActiveMode(getActiveAnchorFromScroll());
    };

    syncActiveMode();
    window.addEventListener("scroll", syncActiveMode, { passive: true });
    window.addEventListener("hashchange", syncActiveMode);

    return () => {
      window.removeEventListener("scroll", syncActiveMode);
      window.removeEventListener("hashchange", syncActiveMode);
    };
  }, []);

  return (
    <aside className="flex h-screen min-h-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]">
      <div className="border-b border-[var(--border)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Federal AI
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Mission Control</h2>
      </div>

      <div className="space-y-4 p-3">
        <nav aria-label="BI modes" className="space-y-1">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            BI modes
          </p>
          {modes.map((mode) => {
            const isActive = activeMode === mode.anchor.replace("#", "");

            return (
              <a
                key={mode.anchor}
                aria-label={`Go to ${mode.label}`}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "inline-flex w-full justify-start rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                  "text-left",
                  isActive
                    ? "border-[var(--border)] bg-[var(--soft)] text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                ].join(" ")}
                role="menuitem"
                href={mode.anchor}
              >
                {mode.label}
              </a>
            );
          })}
        </nav>

        <div className="rounded-md border border-dashed border-[var(--border)] bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Quick focus
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Use the chat for any query. The same BI views are rendered as inline cards.
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-[var(--border)] p-3">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Workspace
        </p>
        <p className="mt-2 rounded-lg border border-dashed border-[var(--border)] bg-white/60 p-3 text-xs leading-5 text-[var(--muted)]">
          Conversation history and inline BI output are managed in the chat panel.
        </p>
      </div>
    </aside>
  );
}
