import { NextResponse } from "next/server";
import { SITE } from "@/lib/site";
import { PLACES } from "@/lib/city/places";
import { GAMES } from "@/lib/games/registry";
import { WIKI_HUBS } from "@/components/wiki/WikiData";

export const dynamic = "force-dynamic";

const INDEXNOW_KEY = "dubailife2026indexnowkey01";

export async function POST(req: Request) {
  return handleIndexNow(req);
}

export async function GET(req: Request) {
  return handleIndexNow(req);
}

async function handleIndexNow(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (secret && process.env.NODE_ENV !== "development") {
    if (authHeader !== `Bearer ${secret}` && authHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const urlList: string[] = [
    `${SITE.url}/`,
    `${SITE.url}/about`,
    `${SITE.url}/explore`,
    `${SITE.url}/wiki`,
    `${SITE.url}/guide`,
    `${SITE.url}/marathon`,
    `${SITE.url}/academics`,
    `${SITE.url}/business`,
    `${SITE.url}/scam-check`,
    ...WIKI_HUBS.map((h) => `${SITE.url}/wiki/${h.slug}`),
    ...GAMES.map((g) => `${SITE.url}/games/${g.id}`),
    ...PLACES.filter((p) => p.kind !== "residential" && p.kind !== "home").map((p) => `${SITE.url}/place/${p.id}`),
  ];

  try {
    const payload = {
      host: SITE.domain,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE.url}/dubailife2026indexnowkey01.txt`,
      urlList: urlList.slice(0, 100), // IndexNow batch limit
    };

    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      submittedUrls: payload.urlList.length,
      host: SITE.domain,
      message: res.ok ? "IndexNow ping successfully submitted to search engines" : `IndexNow response: ${res.statusText}`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "IndexNow ping failed" }, { status: 500 });
  }
}
