import { NextResponse } from "next/server";

import { validateProviderEnv } from "@/lib/ai/provider";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = validateProviderEnv();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: "Federal AI Mission Control",
      database: "reachable",
      provider: provider.providerName,
      providerConfigured: provider.ok,
      providerError: provider.ok ? null : provider.error
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "Federal AI Mission Control",
        database: "unreachable",
        provider: provider.providerName,
        providerConfigured: provider.ok,
        providerError: provider.ok ? null : provider.error,
        error: error instanceof Error ? error.message : "Unknown database error"
      },
      { status: 503 }
    );
  }
}
