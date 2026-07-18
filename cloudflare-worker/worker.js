const BACKEND = "https://novamess.wispbyte.app";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = BACKEND + url.pathname + url.search;

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", url.hostname);
    headers.delete("CF-Connecting-IP");

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "follow",
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Requested-With");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: resHeaders });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  },
};
