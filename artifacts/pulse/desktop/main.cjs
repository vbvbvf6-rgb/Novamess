const { app, BrowserWindow, session, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const webRoot = path.join(app.getAppPath(), "dist");
const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let localServer;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end();
        return;
      }

      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      } catch {
        response.writeHead(400);
        response.end();
        return;
      }

      const candidate = path.resolve(webRoot, `.${pathname}`);
      if (candidate !== webRoot && !candidate.startsWith(`${webRoot}${path.sep}`)) {
        response.writeHead(403);
        response.end();
        return;
      }

      let filePath = candidate;
      try {
        if (!fs.statSync(filePath).isFile()) filePath = path.join(webRoot, "index.html");
      } catch {
        if (path.extname(pathname)) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        filePath = path.join(webRoot, "index.html");
      }

      response.setHeader(
        "Content-Type",
        mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      );
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader(
        "Cache-Control",
        path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=3600",
      );
      fs.createReadStream(filePath).pipe(response);
    });

    localServer.once("error", reject);
    localServer.listen(0, "127.0.0.1", () => {
      const address = localServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not start the local app server."));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      void shell.openExternal(parsed.href);
    }
  } catch {
    // Ignore malformed or unsupported external links.
  }
}

async function createWindow() {
  const appOrigin = await startLocalServer();

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl || webContents.getURL();
    let isAppOrigin = false;
    try {
      isAppOrigin = new URL(requestingUrl).origin === appOrigin;
    } catch {
      // Deny permission requests without a valid origin.
    }
    callback(isAppOrigin && ["media", "notifications"].includes(permission));
  });

  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 360,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0d0f14",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${appOrigin}/`)) return { action: "allow" };
    openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (url === appOrigin || url.startsWith(`${appOrigin}/`)) return;
    event.preventDefault();
    openExternal(url);
  });

  window.once("ready-to-show", () => window.show());
  await window.loadURL(appOrigin);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error("Nova Messenger failed to start:", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  localServer?.close();
});
