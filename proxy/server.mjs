import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const port = Number(process.env.PORT || 8080);
const rawOrigin = process.env.NOVA_ORIGIN;

if (!rawOrigin) {
  console.error("[proxy] NOVA_ORIGIN is required, for example https://nova-origin.example.com");
  process.exit(1);
}

let origin;
try {
  origin = new URL(rawOrigin);
  if (!["http:", "https:"].includes(origin.protocol)) {
    throw new Error("NOVA_ORIGIN must use http or https");
  }
  if (origin.username || origin.password) {
    throw new Error("NOVA_ORIGIN must not contain credentials");
  }
} catch (error) {
  console.error(`[proxy] Invalid NOVA_ORIGIN: ${error.message}`);
  process.exit(1);
}

const transport = origin.protocol === "https:" ? https : http;
const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function originPath(requestUrl) {
  const incoming = new URL(requestUrl || "/", "http://nova-proxy.invalid");
  const basePath = origin.pathname.replace(/\/?$/, "/");
  const requestPath = `${incoming.pathname}${incoming.search}`;
  return `${basePath}${requestPath.replace(/^\/+/, "")}`;
}

function forwardedHeaders(headers, { websocket = false } = {}) {
  const result = {};
  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    if (hopByHopHeaders.has(lowerName) && !(websocket && (lowerName === "connection" || lowerName === "upgrade"))) {
      continue;
    }
    if (lowerName !== "host") result[name] = value;
  }
  result.host = origin.host;
  result["x-forwarded-host"] = headers.host || "";
  result["x-forwarded-proto"] = "https";
  return result;
}

function closeSocket(socket) {
  socket.destroy();
}

function proxyHttpRequest(request, response) {
  const proxyRequest = transport.request({
    protocol: origin.protocol,
    hostname: origin.hostname,
    port: origin.port || undefined,
    method: request.method,
    path: originPath(request.url),
    headers: forwardedHeaders(request.headers),
    timeout: 300_000,
  }, (proxyResponse) => {
    const headers = {};
    for (const [name, value] of Object.entries(proxyResponse.headers)) {
      if (!hopByHopHeaders.has(name.toLowerCase())) headers[name] = value;
    }

    const contentType = String(headers["content-type"] || "");
    if (contentType.includes("text/event-stream")) {
      headers["cache-control"] = "no-cache";
      headers["x-accel-buffering"] = "no";
    }

    response.writeHead(proxyResponse.statusCode || 502, headers);
    if (contentType.includes("text/event-stream")) response.flushHeaders?.();
    proxyResponse.pipe(response);
  });

  proxyRequest.on("timeout", () => proxyRequest.destroy(new Error("upstream timeout")));
  proxyRequest.on("error", (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Nova origin is unavailable" }));
    } else {
      response.destroy(error);
    }
  });

  request.pipe(proxyRequest);
}

function proxyWebSocket(request, clientSocket, head) {
  const proxyRequest = transport.request({
    protocol: origin.protocol,
    hostname: origin.hostname,
    port: origin.port || undefined,
    method: request.method || "GET",
    path: originPath(request.url),
    headers: forwardedHeaders(request.headers, { websocket: true }),
    timeout: 300_000,
  });

  proxyRequest.on("upgrade", (proxyResponse, upstreamSocket, upstreamHead) => {
    const status = proxyResponse.statusCode || 101;
    const reason = proxyResponse.statusMessage || "Switching Protocols";
    const headers = Object.entries(proxyResponse.headers)
      .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\r\n");

    clientSocket.write(`HTTP/1.1 ${status} ${reason}\r\n${headers}\r\n\r\n`);
    if (upstreamHead.length) clientSocket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);

    clientSocket.on("error", closeSocket);
    upstreamSocket.on("error", closeSocket);
    clientSocket.pipe(upstreamSocket);
    upstreamSocket.pipe(clientSocket);
  });

  proxyRequest.on("response", (proxyResponse) => {
    proxyResponse.resume();
    closeSocket(clientSocket);
  });
  proxyRequest.on("timeout", () => proxyRequest.destroy());
  proxyRequest.on("error", () => closeSocket(clientSocket));
  proxyRequest.end();
}

const server = http.createServer((request, response) => {
  if (request.url === "/__proxy/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  proxyHttpRequest(request, response);
});

server.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/__proxy/")) {
    closeSocket(socket);
    return;
  }
  proxyWebSocket(request, socket, head);
});

server.on("clientError", (_error, socket) => closeSocket(socket));
server.listen(port, "0.0.0.0", () => {
  console.log(`[proxy] listening on 0.0.0.0:${port}`);
  console.log(`[proxy] forwarding to ${origin.origin}`);
});
