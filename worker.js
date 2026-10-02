const BASE_PATH = "/wedding-gallery";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        let pathname = url.pathname;

        // Remove the /wedding-gallery prefix
        // so Cloudflare Assets can find the actual file.
        if (pathname === BASE_PATH) {
            pathname = "/";
        } else if (pathname.startsWith(`${BASE_PATH}/`)) {
            pathname = pathname.slice(BASE_PATH.length);
        }

        // Download file from R2
        if (pathname.startsWith("/download/")) {
            const key = decodeURIComponent(
                pathname.replace("/download/", "")
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

        // Serve static website
        const assetUrl = new URL(request.url);
        assetUrl.pathname = pathname;

        return env.ASSETS.fetch(
            new Request(assetUrl, request)
        );
    }
};