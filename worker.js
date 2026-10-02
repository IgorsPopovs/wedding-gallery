const GALLERY_PREFIX = "/wedding-gallery";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Handle R2 downloads
        if (url.pathname.startsWith(`${GALLERY_PREFIX}/download/`)) {
            const key = decodeURIComponent(
                url.pathname.replace(
                    `${GALLERY_PREFIX}/download/`,
                    ""
                )
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

        // Remove /wedding-gallery from the URL
        const assetUrl = new URL(request.url);

        if (
            assetUrl.pathname === GALLERY_PREFIX ||
            assetUrl.pathname === `${GALLERY_PREFIX}/`
        ) {
            assetUrl.pathname = "/index.html";
        } else if (
            assetUrl.pathname.startsWith(`${GALLERY_PREFIX}/`)
        ) {
            assetUrl.pathname =
                assetUrl.pathname.substring(
                    GALLERY_PREFIX.length
                );
        } else {
            return new Response("Not Found", {
                status: 404
            });
        }

        return env.ASSETS.fetch(
            new Request(assetUrl, request)
        );
    }
};