const BASE_PATH = "/wedding-gallery";
const PHOTO_PREFIX = "small/";
const PHOTO_TAGS_KEY = "metadata/photo-tags-v1.json";
const PEOPLE_IDS = new Set([
    "kristaps-kalns",
    "alexander-farbtukh",
    "alexandra-farbtukh",
    "alina-maf",
    "zhenya",
    "alina-saf",
    "valentin",
    "artem",
    "anzhela",
    "artur",
    "babushka-larisa",
    "babushka-valentina",
    "valeriy-farbtukh",
    "alexandra-romanovskaya",
    "daniel-danika",
    "darya-danika",
    "diana",
    "alexey",
    "dmitry-leonov",
    "dasha-leonova",
    "kristina-mogilevtseva",
    "leonid",
    "max",
    "valeria",
    "mom-natalia-u",
    "mom-natalia-p",
    "olya",
    "misha",
    "papa",
    "kristina-papa",
    "tatyana",
    "vladimir",
    "filipp",
    "kristina-filipp",
    "eduard",
    "alexandra-leonova",
    "igor-zorya-groom",
    "alina-zorya-bride"
]);

async function readPhotoTags(bucket) {
    const object = await bucket.get(PHOTO_TAGS_KEY);
    if (!object) {
        return {};
    }

    try {
        const data = JSON.parse(await object.text());
        return data && typeof data === "object" && !Array.isArray(data)
            ? data
            : {};
    } catch (error) {
        return {};
    }
}

async function writePhotoTags(bucket, tags) {
    await bucket.put(PHOTO_TAGS_KEY, JSON.stringify(tags), {
        httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
}

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

        if (path === "/api/photo-tags" && request.method === "GET") {
            const tags = await readPhotoTags(env.GALLERY);
            return new Response(JSON.stringify(tags), {
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            });
        }

        if (path === "/api/photo-tags" && request.method === "PUT") {
            if (!env.GALLERY_ADMIN_TOKEN) {
                return new Response("Admin token is not configured", { status: 503 });
            }
            if (request.headers.get("Authorization") !== "Bearer " + env.GALLERY_ADMIN_TOKEN) {
                return new Response("Unauthorized", { status: 401 });
            }

            const filename = url.searchParams.get("filename");
            if (
                !filename ||
                filename.includes("/") ||
                filename.includes("\\") ||
                !filename.includes("_s_") ||
                !filename.toLowerCase().endsWith(".jpg")
            ) {
                return new Response("Invalid photo filename", { status: 400 });
            }

            if (!(await env.GALLERY.head("small/" + filename))) {
                return new Response("Photo not found", { status: 404 });
            }

            let body;
            try {
                body = await request.json();
            } catch (error) {
                return new Response("Invalid request body", { status: 400 });
            }

            if (
                !body ||
                !Array.isArray(body.personIds) ||
                body.personIds.some(function (id) {
                    return typeof id !== "string" || !PEOPLE_IDS.has(id);
                })
            ) {
                return new Response("Invalid person list", { status: 400 });
            }

            const tags = await readPhotoTags(env.GALLERY);
            const personIds = [...new Set(body.personIds)];
            if (personIds.length) {
                tags[filename] = personIds;
            } else {
                delete tags[filename];
            }
            await writePhotoTags(env.GALLERY, tags);

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json; charset=utf-8" }
            });
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

        if (path === "/api/delete-photos") {
            if (request.method !== "DELETE") {
                return new Response("Method not allowed", {
                    status: 405,
                    headers: { "Allow": "DELETE" }
                });
            }

            if (!env.GALLERY_ADMIN_TOKEN) {
                return new Response("Admin token is not configured", { status: 503 });
            }

            if (request.headers.get("Authorization") !== "Bearer " + env.GALLERY_ADMIN_TOKEN) {
                return new Response("Unauthorized", { status: 401 });
            }

            let body;
            try {
                body = await request.json();
            } catch (error) {
                return new Response("Invalid request body", { status: 400 });
            }

            const filenames = body?.filenames;
            if (!Array.isArray(filenames) || filenames.length === 0 || filenames.length > 500) {
                return new Response("Expected between 1 and 500 photo filenames", { status: 400 });
            }

            const uniqueFilenames = [...new Set(filenames)];
            const isValidFilename = (filename) =>
                typeof filename === "string" &&
                !filename.includes("/") &&
                !filename.includes("\\") &&
                filename.includes("_s_") &&
                filename.toLowerCase().endsWith(".jpg");
            if (uniqueFilenames.length !== filenames.length || !filenames.every(isValidFilename)) {
                return new Response("Invalid photo filenames", { status: 400 });
            }

            await env.GALLERY.delete(uniqueFilenames.flatMap((filename) => [
                "small/" + filename,
                "big/" + filename.replace("_s_", "_b_")
            ]));

            const tags = await readPhotoTags(env.GALLERY);
            uniqueFilenames.forEach((filename) => delete tags[filename]);
            await writePhotoTags(env.GALLERY, tags);

            return new Response(JSON.stringify({ deleted: uniqueFilenames.length }), {
                headers: { "Content-Type": "application/json; charset=utf-8" }
            });
        }

        if (path === "/api/delete-photo") {
            if (request.method !== "DELETE") {
                return new Response("Method not allowed", {
                    status: 405,
                    headers: { "Allow": "DELETE" }
                });
            }

            if (!env.GALLERY_ADMIN_TOKEN) {
                return new Response("Admin token is not configured", {
                    status: 503
                });
            }

            if (request.headers.get("Authorization") !== "Bearer " + env.GALLERY_ADMIN_TOKEN) {
                return new Response("Unauthorized", {
                    status: 401
                });
            }

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

            await env.GALLERY.delete([
                "small/" + filename,
                "big/" + filename.replace("_s_", "_b_")
            ]);

            const tags = await readPhotoTags(env.GALLERY);
            if (Object.hasOwn(tags, filename)) {
                delete tags[filename];
                await writePhotoTags(env.GALLERY, tags);
            }

            return new Response(null, { status: 204 });
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
