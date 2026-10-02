export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const pathname = url.pathname;

        // Remove the /wedding-gallery prefix
        let assetPath = pathname;

        if (assetPath === "/wedding-gallery") {
            assetPath = "/";
        } else if (assetPath.startsWith("/wedding-gallery/")) {
            assetPath = assetPath.substring(
                "/wedding-gallery".length
            );
        }

        // Downloads from R2
        if (assetPath.startsWith("/download/")) {
            const key = decodeURIComponent(
                assetPath.substring("/download/".length)
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

        // Serve static assets
        const assetUrl = new URL(request.url);

        assetUrl.pathname =
            assetPath === "/"
                ? "/index.html"
                : assetPath;

        return env.ASSETS.fetch(
            new Request(assetUrl, request)
        );
    }
};