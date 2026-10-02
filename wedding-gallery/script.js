const photos = Array.from(
    { length: 10 },
    (_, i) => `I+A_s_${String(i + 1).padStart(5, "0")}.jpg`
);

const photoBaseUrl = "https://photos.aligor.us";
const galleryBasePath = "/wedding-gallery";

const gallery = document.getElementById("gallery");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");

const downloadBig = document.getElementById("download-big");
const downloadSmall = document.getElementById("download-small");

const closeButton = document.querySelector(".close");
const previousButton = document.querySelector(".prev");
const nextButton = document.querySelector(".next");

let currentIndex = 0;

// Create thumbnails
photos.forEach((filename, index) => {
    const img = document.createElement("img");

    img.src =
        `${photoBaseUrl}/small/${encodeURIComponent(filename)}`;

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

    // Download full-size image
    downloadBig.href =
        `${galleryBasePath}/download/big/${encodeURIComponent(bigFilename)}`;

    downloadBig.download = bigFilename;

    // Download small image
    downloadSmall.href =
        `${galleryBasePath}/download/small/${encodeURIComponent(smallFilename)}`;

    downloadSmall.download = smallFilename;

    lightbox.classList.add("active");
}

// Close lightbox
function closeLightbox() {
    lightbox.classList.remove("active");
    lightboxImage.src = "";
}

// Close button
closeButton.addEventListener("click", closeLightbox);

// Click outside photo
lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
        closeLightbox();
    }
});

// Previous photo
previousButton.addEventListener("click", (event) => {
    event.stopPropagation();

    openPhoto(
        (currentIndex - 1 + photos.length) % photos.length
    );
});

// Next photo
nextButton.addEventListener("click", (event) => {
    event.stopPropagation();

    openPhoto(
        (currentIndex + 1) % photos.length
    );
});

// Keyboard controls
document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) {
        return;
    }

    if (event.key === "Escape") {
        closeLightbox();
    }

    if (event.key === "ArrowLeft") {
        openPhoto(
            (currentIndex - 1 + photos.length) % photos.length
        );
    }

    if (event.key === "ArrowRight") {
        openPhoto(
            (currentIndex + 1) % photos.length
        );
    }
});