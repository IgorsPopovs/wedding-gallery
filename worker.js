```javascript
const BASE_PATH = "/wedding-gallery";
const PHOTO_PREFIX = "small/";

export default {
    fetch: async function (request, env) {
        const url = new URL(request.url);

        let path = url.pathname;

        // Remove /wedding-gallery from the URL
        if (path === BASE_PATH || path === BASE_PATH + "/") {
            path = "/";
        } else if (path.indexOf(BASE_PATH + "/") === 0) {
            path = path.substring(BASE_PATH.length);
        }

        // ==========================================
        // GET PHOTO LIST FROM R2
        // ==========================================

        if (path === "/api/photos") {
            const photos = [];

            let cursor = null;
            let hasMore = true;

            while (hasMore) {
                const options = {
                    prefix: PHOTO_PREFIX,
                    limit: 1000
                };

                if (cursor) {
                    options.cursor = cursor;
                }

                const result = await env.GALLERY.list(options);

                for (let i = 0; i < result.objects.length; i++) {
                    const object = result.objects[i];

                    if (
                        object.key.indexOf(PHOTO_PREFIX) === 0 &&
                        object.key.toLowerCase().endsWith(".jpg")
                    ) {
                        const filename =
                            object.key.substring(
                                PHOTO_PREFIX.length
                            );

                        photos.push(filename);
                    }
                }

                if (result.truncated) {
                    cursor = result.cursor;
                } else {
                    hasMore = false;
                }
            }

            return new Response(
                JSON.stringify(photos),
                {
                    status: 200,
                    headers: {
                        "Content-Type":
                            "application/json; charset=UTF-8",

                        "Cache-Control":
                            "public, max-age=300"
                    }
                }
            );
        }

        // ==========================================
        // DOWNLOAD FROM R2
        // ==========================================

        if (path.indexOf("/download/") === 0) {
            const key = decodeURIComponent(
                path.substring("/download/".length)
            );

            const object =
                await env.GALLERY.get(key);

            if (!object) {
                return new Response(
                    "File not found",
                    {
                        status: 404
                    }
                );
            }

            const filename =
                key.substring(
                    key.lastIndexOf("/") + 1
                );

            const headers = new Headers();

            headers.set(
                "Content-Type",
                object.httpMetadata &&
                object.httpMetadata.contentType
                    ? object.httpMetadata.contentType
                    : "application/octet-stream"
            );

            headers.set(
                "Content-Disposition",
                'attachment; filename="' +
                    filename +
                    '"'
            );

            headers.set(
                "Content-Length",
                String(object.size)
            );

            headers.set(
                "Cache-Control",
                "no-store"
            );

            return new Response(
                object.body,
                {
                    status: 200,
                    headers: headers
                }
            );
        }

        // ==========================================
        // STATIC WEBSITE
        // ==========================================

        const assetUrl =
            new URL(request.url);

        if (path === "/") {
            assetUrl.pathname =
                "/index.html";
        } else {
            assetUrl.pathname = path;
        }

        return env.ASSETS.fetch(
            new Request(
                assetUrl,
                request
            )
        );
    }
};
```