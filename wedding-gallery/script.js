const photos = Array.from(
    { length: 10 },
    (_, i) => `I+A_s_${String(i + 1).padStart(5, "0")}.jpg`
);

const photoBaseUrl = "https://photos.aligor.us";

const gallery = document.getElementById("gallery");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");

const downloadBig = document.getElementById("download-big");
const downloadSmall = document.getElementById("download-small");

let currentIndex = 0;

// Create thumbnails
photos.forEach((filename, index) => {
    const img = document.createElement("img");

    img.src = `${photoBaseUrl}/small/${encodeURIComponent(filename)}`;
    img.className = "thumbnail";
    img.loading = "lazy";

    img.addEventListener("click", () => {
        openPhoto(index);
    });

    gallery.appendChild(img);
});

// Open photo
function openPhoto(index) {
    currentIndex = index;

    const smallFilename = photos[index];
    const bigFilename = smallFilename.replace("_s_", "_b_");

    const smallUrl =
        `${photoBaseUrl}/small/${encodeURIComponent(smallFilename)}`;

    const bigUrl =
        `${photoBaseUrl}/big/${encodeURIComponent(bigFilename)}`;

    // Show full-size image
    lightboxImage.src = bigUrl;
    lightboxImage.alt = bigFilename;

    // Download buttons
    downloadBig.onclick = () => {
        downloadFile(bigUrl, bigFilename);
    };

    downloadSmall.onclick = () => {
        downloadFile(smallUrl, smallFilename);
    };

    lightbox.classList.add("active");
}

// Download file
async function downloadFile(url, filename) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed:", error);

        // Fallback: open the file
        window.open(url, "_blank");
    }
}

// Close lightbox
function closeLightbox() {
    lightbox.classList.remove("active");
    lightboxImage.src = "";
}

lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
        closeLightbox();
    }
});

// Keyboard controls
document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) {
        return;
    }

    if (event.key === "Escape") {
        closeLightbox();
    }

    if (event.key === "ArrowRight") {
        openPhoto((currentIndex + 1) % photos.length);
    }

    if (event.key === "ArrowLeft") {
        openPhoto(
            (currentIndex - 1 + photos.length) % photos.length
        );
    }
});