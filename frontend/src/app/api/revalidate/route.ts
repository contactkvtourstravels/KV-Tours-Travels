import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const REVALIDATION_SECRET =
  process.env.REVALIDATION_SECRET ||
  process.env.NEXT_PUBLIC_REVALIDATION_SECRET ||
  "kv-tours-secret-revalidate-token";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret") || request.headers.get("x-revalidate-secret");
    const tag = searchParams.get("tag");
    const path = searchParams.get("path");

    // Optional JSON body support
    let bodyTag = "";
    let bodyPath = "";
    let bodySecret = "";
    try {
      const body = await request.json();
      if (body) {
        bodyTag = body.tag || "";
        bodyPath = body.path || "";
        bodySecret = body.secret || "";
      }
    } catch {
      // Body is optional
    }

    const effectiveSecret = secret || bodySecret;
    if (effectiveSecret && effectiveSecret !== REVALIDATION_SECRET) {
      return NextResponse.json({ message: "Invalid secret token" }, { status: 401 });
    }

    const targetTag = tag || bodyTag;
    const targetPath = path || bodyPath;

    const revalidated: string[] = [];

    if (targetTag) {
      revalidateTag(targetTag, { expire: 0 });
      revalidated.push(`tag:${targetTag}`);
    }

    if (targetPath) {
      revalidatePath(targetPath);
      revalidated.push(`path:${targetPath}`);
    }

    // Default purge for catalog updates if nothing specific passed
    if (!targetTag && !targetPath) {
      revalidateTag("catalog", { expire: 0 });
      revalidateTag("home_feed", { expire: 0 });
      revalidatePath("/");
      revalidatePath("/packages");
      revalidatePath("/destinations");
      revalidatePath("/group-trips");
      revalidated.push("catalog", "home_feed", "/", "/packages", "/destinations", "/group-trips");
    }

    return NextResponse.json({
      revalidated: true,
      targets: revalidated,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { message: "Error revalidating", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET revalidation for simple webhook pings or manual admin triggers
  return POST(request);
}
