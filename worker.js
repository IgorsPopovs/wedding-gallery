const BASE_PATH = "/wedding-gallery";

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

        // Handle downloads from R2
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
                        object.size.toString()
                }
            });
        }

        // Serve the website
        const assetUrl = new URL(request.url);

        assetUrl.pathname =
            path === "/" ? "/index.html" : path;

        return env.ASSETS.fetch(
            new Request(assetUrl, request)
        );
    }
};