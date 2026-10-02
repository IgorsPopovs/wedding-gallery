export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Download from R2
        if (url.pathname.startsWith("/download/")) {
            const key = decodeURIComponent(
                url.pathname.replace("/download/", "")
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

        // Everything else → static website
        return env.ASSETS.fetch(request);
    }
};