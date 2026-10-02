const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const photoBaseUrl = "https://photos.aligor.us";
const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
};

http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    if (url.pathname === "/download") {
        const size = url.searchParams.get("size");
        const filename = url.searchParams.get("filename");
        const expectedMarker = size === "small" ? "s" : size === "big" ? "b" : null;

        if (!expectedMarker || !filename || !/^I\+A_[sb]_\d{5}\.jpg$/.test(filename) ||
            filename.split("_")[1] !== expectedMarker) {
            response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Invalid image request");
            return;
        }

        try {
            const upstreamUrl = `${photoBaseUrl}/${size}/${encodeURIComponent(filename)}`;
            const upstream = await fetch(upstreamUrl);
            if (!upstream.ok || !upstream.body) {
                response.writeHead(upstream.status || 502, { "Content-Type": "text/plain; charset=utf-8" });
                response.end("The image could not be downloaded");
                return;
            }

            response.writeHead(200, {
                "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            });
            for await (const chunk of upstream.body) response.write(chunk);
            response.end();
        } catch (error) {
            console.error("Image download proxy failed:", error);
            if (!response.headersSent) {
                response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
                response.end("The image could not be downloaded");
            }
        }
        return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(root, `.${requestedPath}`);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403);
        response.end();
        return;
    }

    fs.readFile(filePath, (error, contents) => {
        if (error) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }
        response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
        response.end(contents);
    });
}).listen(3000, () => {
    console.log("Wedding gallery running at http://localhost:3000");
});
