import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(import.meta.dirname, "..");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
http
  .createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      const file = resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (
        !file.startsWith(root + sep) ||
        /(?:^|\/)\./.test(pathname) ||
        pathname.includes("node_modules")
      ) {
        response.writeHead(403).end();
        return;
      }
      const data = await readFile(file);
      response.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self'; base-uri 'none'; form-action 'none'",
      });
      response.end(data);
    } catch {
      response.writeHead(404).end("Not found");
    }
  })
  .listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
    console.log(
      `folio is ready at http://localhost:${process.env.PORT || 3000}`,
    ),
  );
