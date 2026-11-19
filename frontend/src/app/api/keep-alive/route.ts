import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight keep-alive probe to prevent Render cloud container from sleeping.
 * Triggered automatically by Vercel Cron every 10 minutes, and can be hit by external uptime monitors.
 */
export async function GET() {
  const rawBackendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
      : "") ||
    "https://travel-agency-kdrs.onrender.com";

  const backendUrl = rawBackendUrl.replace(/\/+$/, "");
  const healthEndpoint = `${backendUrl}/api/v1/health/ready`;

  try {
    const startTime = Date.now();
    const res = await fetch(healthEndpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "KV-KeepAlive-Probe/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });

    const elapsedMs = Date.now() - startTime;
    const isOk = res.ok;
    const body = await res.json().catch(() => null);

    return NextResponse.json({
      status: isOk ? "ok" : "degraded",
      statusCode: res.status,
      elapsedMs,
      endpoint: healthEndpoint,
      backend: body,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        status: "warming_up",
        message: "Backend ping timed out or container is spinning up.",
        error: errorMsg,
        endpoint: healthEndpoint,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
