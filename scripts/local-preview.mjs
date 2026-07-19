import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 8765);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function sendJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function serveStatic(request, response) {
  const urlPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  let filePath = resolve(join(root, `.${requestedPath}`));
  const relativePath = relative(root, filePath);

  if (relativePath.startsWith("..") || relativePath.includes(`..${normalize("/")}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    let fileInfo = await stat(filePath);
    if (fileInfo.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileInfo = await stat(filePath);
    }
    if (!fileInfo.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;

  if (pathname === "/api/verify-code" && request.method === "POST") {
    // This endpoint exists only in the loopback preview server. Production still uses Worker + D1.
    sendJson(response, { success: true, localPreview: true });
    return;
  }

  if (pathname === "/api/member/me" && request.method === "GET") {
    sendJson(response, { success: true, member: { active: false, authenticated: false } });
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(response, { success: false, message: "本地预览不提供此接口" }, 404);
    return;
  }

  await serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`本地预览已启动：http://127.0.0.1:${port}/`);
  console.log("本地测试码验证已开启，正式环境配置不会被修改。");
});
