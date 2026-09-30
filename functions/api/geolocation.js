export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: "lat,lng required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 당근 API URL 구성
    const targetUrl =
      `https://www.daangn.com/v1/api/search/kr/location?lat=${lat}&lng=${lng}`;

    // 서버 측에서 fetch → CORS 없음
    const daangnRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0", // UA 없으면 차단될 가능성 있음
        "Accept": "application/json"
      }
    });

    const result = await daangnRes.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
