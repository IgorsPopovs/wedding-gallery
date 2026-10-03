const BASE_PATH = "/wedding-gallery";
const PHOTO_PREFIX = "small/";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        let path = url.pathname;

        if (path === BASE_PATH || path === BASE_PATH + "/") {
            path = "/";
        } else if (path.startsWith(BASE_PATH + "/")) {
            path = path.slice(BASE_PATH.length);
        }

        if (path === "/api/photos") {
            const photos = [];
            let cursor;

            while (true) {
                const options = {
                    prefix: PHOTO_PREFIX,
                    limit: 1000
                };

                if (cursor) {
                    options.cursor = cursor;
                }

                const result =
                    await env.GALLERY.list(options);

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

                if (!result.truncated) {
                    break;
                }

                cursor = result.cursor;
            }

            return new Response(
                JSON.stringify(photos),
                {
                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (path === "/api/share-photo") {
            const filename = url.searchParams.get("filename");

            if (
                !filename ||
                filename.includes("/") ||
                filename.includes("\\") ||
                !filename.includes("_s_") ||
                !filename.toLowerCase().endsWith(".jpg")
            ) {
                return new Response("Invalid photo filename", {
                    status: 400
                });
            }

            const object = await env.GALLERY.get("small/" + filename);

            if (!object) {
                return new Response("File not found", {
                    status: 404
                });
            }

            return new Response(object.body, {
                headers: {
                    "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
                    "Content-Length": String(object.size),
                    "Cache-Control": "private, max-age=3600"
                }
            });
        }

        if (path === "/api/photo-sizes") {
            const filename =
                url.searchParams.get("filename");

            if (
                !filename ||
                filename.includes("/") ||
                filename.includes("\\") ||
                !filename.includes("_s_") ||
                !filename.toLowerCase().endsWith(".jpg")
            ) {
                return new Response(
                    "Invalid photo filename",
                    {
                        status: 400
                    }
                );
            }

            const bigFilename =
                filename.replace("_s_", "_b_");

            const [smallObject, bigObject] =
                await Promise.all([
                    env.GALLERY.head("small/" + filename),
                    env.GALLERY.head("big/" + bigFilename)
                ]);

            return new Response(
                JSON.stringify({
                    small: smallObject?.size ?? null,
                    big: bigObject?.size ?? null
                }),
                {
                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8",
                        "Cache-Control":
                            "public, max-age=3600"
                    }
                }
            );
        }

        if (path.startsWith("/download/")) {
            const key = decodeURIComponent(
                path.slice("/download/".length)
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
                key.split("/").pop();

            return new Response(
                object.body,
                {
                    headers: {
                        "Content-Type":
                            object.httpMetadata?.contentType ||
                            "application/octet-stream",

                        "Content-Disposition":
                            'attachment; filename="' +
                            filename +
                            '"',

                        "Content-Length":
                            String(object.size),

                        "Cache-Control":
                            "no-store"
                    }
                }
            );
        }

        const assetUrl =
            new URL(request.url);

        assetUrl.pathname =
            path === "/"
                ? "/index.html"
                : path;

        return env.ASSETS.fetch(
            new Request(
                assetUrl,
                request
            )
        );
    }
};
