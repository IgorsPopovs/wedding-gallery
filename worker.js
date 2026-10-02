```js
const BASE_PATH = "/wedding-gallery";
const PHOTO_PREFIX = "small/";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        let path = url.pathname;

        // Remove /wedding-gallery from the request path
        if (path === BASE_PATH || path === `${BASE_PATH}/`) {
            path = "/";
        } else if (path.startsWith(`${BASE_PATH}/`)) {
            path = path.slice(BASE_PATH.length);
        }

        // Return the list of photos from R2
        if (path === "/api/photos") {
            const photos = [];

            let cursor;

            do {
                const result = await env.GALLERY.list({
                    prefix: PHOTO_PREFIX,
                    limit: 1000,
                    ...(cursor ? { cursor } : {})
                });

                for (const object of result.objects) {
                    if (
                        object.key.startsWith(PHOTO_PREFIX) &&
                        object.key.toLowerCase().endsWith(".jpg")
                    ) {
                        photos.push(
                            object.key.slice(PHOTO_PREFIX.length)
                        );
                    }
                }

                cursor = result.truncated
                    ? result.cursor
                    : undefined;

            } while (cursor);

            return new Response(
                JSON.stringify(photos),
                {
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Cache-Control": "public, max-age=300"
                    }
                }
            );
        }

        // R2 downloads
        if (path.startsWith("/download/")) {
            const key = decodeURIComponent(
                path.slice("/download/".length)
            );

            const object = await env.GALLERY.get(key);

            if (!object) {
                return new Response("File not found", {
                    status: 404
                });
            }

            const filename = key.split("/").pop();

            return new Response(object.body, {
                headers: {
                    "Content-Type":
                        object.httpMetadata?.contentType ||
                        "application/octet-stream",

                    "Content-Disposition":
                        `attachment; filename="${filename}"`,

                    "Content-Length":
                        object.size.toString(),

                    "Cache-Control":
                        "no-store"
                }
            });
        }

        // Static website
        const assetUrl = new URL(request.url);

        assetUrl.pathname =
            path === "/" ? "/index.html" : path;

        return env.ASSETS.fetch(
            new Request(assetUrl, request)
        );
    }
};
```