const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ✅ asset_id: 기본값은 당신이 준 ID
    const assetId =
      (req.query && req.query.asset) ||
      "3ac5c728-4bef-41e0-9f02-af89b4d4a371";

    // 1) 실제 다운로드 URL 조회
    const { data: asset, error: assetErr } = await supabase
      .from("release_assets")
      .select("download_url")
      .eq("id", assetId)
      .single();

    if (assetErr || !asset || !asset.download_url) {
      return res.status(404).json({
        ok: false,
        message: "Asset not found or download_url is missing",
        asset_id: assetId,
      });
    }

    // 2) 다운로드 로그 기록 (최소 필드만)
    const ua = req.headers["user-agent"] || null;
    const ref =
      req.headers["referer"] || req.headers["referrer"] || null;

    await supabase.from("downloads").insert([
      {
        asset_id: assetId,
        status: "success",
        user_agent: ua,
        referrer: ref,
      },
    ]);

    // 3) 리다이렉트
    res.statusCode = 302;
    res.setHeader("Location", asset.download_url);
    // 다운로드 링크는 캐시하면 집계가 꼬일 수 있어서 no-store 권장
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  } catch (e) {
    return res.status(500).json({ ok: false, message: String(e) });
  }
};