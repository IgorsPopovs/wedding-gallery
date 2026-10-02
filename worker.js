const BASE_PATH = "/wedding-gallery";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        let path = url.pathname;

        /*
         * Remove the /wedding-gallery prefix.
         *
         * Examples:
         *
         * /wedding-gallery/
         *     -> /
         *
         * /wedding-gallery/style.css
         *     -> /style.css
         *
         * /wedding-gallery/script.js
         *     -> /script.js
         *
         * /wedding-gallery/download/big/...
         *     -> /download/big/...
         */

        if (path === BASE_PATH || path === `${BASE_PATH}/`) {
            path = "/";
        } else if (path.startsWith(`${BASE_PATH}/`)) {
            path = path.slice(BASE_PATH.length);
        }

        /*
         * R2 DOWNLOAD
         */

        if (path.startsWith("/download/")) {
            const key = decodeURIComponent(
                path.slice("/download/".length)
            );

            const validFile =
                /^(small|big)\/I\+A_[sb]_\d{5}\.jpg$/.test(key);

            if (!validFile) {
                return new Response("Invalid image request", {
                    status: 400
                });
            }

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
                        "image/jpeg",

                    "Content-Disposition":
                        `attachment; filename="${filename}"`,

                    "Cache-Control":
                        "no-store"
                }
            });
        }

        /*
         * STATIC ASSETS
         */

        const assetUrl = new URL(request.url);

        assetUrl.pathname = path;

        /*
         * Root of the gallery should load index.html.
         */

        if (path === "/") {
            assetUrl.pathname = "/index.html";
        }

        return env.ASSETS.fetch(
            new Request(assetUrl, request)
        );
    }
};