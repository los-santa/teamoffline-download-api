export const config = { runtime: "edge" };

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);

    const assetId =
      url.searchParams.get("asset") ||
      "3ac5c728-4bef-41e0-9f02-af89b4d4a371";

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { ok: false, message: "Missing env vars" });
    }

    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    };

    const assetRes = await fetch(
      `${SUPABASE_URL}/rest/v1/release_assets?id=eq.${assetId}&select=download_url`,
      { headers }
    );

    const assetJson = await assetRes.json().catch(() => null);
    const downloadUrl = assetJson && assetJson[0] && assetJson[0].download_url;

    if (!assetRes.ok || !downloadUrl) {
      return json(404, {
        ok: false,
        message: "Asset not found or download_url is missing",
        asset_id: assetId,
      });
    }

    const ua = req.headers.get("user-agent");
    const ref = req.headers.get("referer") || req.headers.get("referrer");

    await fetch(`${SUPABASE_URL}/rest/v1/downloads`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          asset_id: assetId,
          status: "success",
          user_agent: ua,
          referrer: ref,
        },
      ]),
    });

    return Response.redirect(downloadUrl, 302);
  } catch (e) {
    return json(500, { ok: false, message: String(e) });
  }
}