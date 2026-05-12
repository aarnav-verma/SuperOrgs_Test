import type { ReactNode } from "react";

import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightContextRail } from "@/components/layout/RightContextRail";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen">
          <LeftSidebar />
        </div>

        <section className="min-h-screen overflow-x-hidden bg-[var(--main)]">{children}</section>

        <div className="hidden xl:sticky xl:top-0 xl:block xl:h-screen">
          <RightContextRail />
        </div>
      </div>
    </main>
  );
}
