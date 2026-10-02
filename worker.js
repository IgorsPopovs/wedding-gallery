export default {
    async fetch(request, env) {
        const url = new URL(request.url);

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

        return env.ASSETS.fetch(request);
    }
};