import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Federal AI Mission Control",
  description: "Chat-native BI for AI inventory, governance, COTS adoption, and cost intelligence."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
