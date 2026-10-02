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

function openPhoto(index) {
    currentIndex = index;

    const smallFilename = photos[index];
    const bigFilename = smallFilename.replace("_s_", "_b_");

    lightboxImage.src =
        `${photoBaseUrl}/big/${encodeURIComponent(bigFilename)}`;

    setDownload(downloadBig, "big", bigFilename);
    setDownload(downloadSmall, "small", smallFilename);

    lightbox.classList.add("active");
}

function setDownload(link, size, filename) {
    const downloadUrl = `/download?size=${encodeURIComponent(size)}&filename=${encodeURIComponent(filename)}`;
    link.href = downloadUrl;
    link.download = filename;
}

function closePhoto() {
    lightbox.classList.remove("active");
}

function nextPhoto() {
    currentIndex = (currentIndex + 1) % photos.length;
    openPhoto(currentIndex);
}

function previousPhoto() {
    currentIndex =
        (currentIndex - 1 + photos.length) % photos.length;

    openPhoto(currentIndex);
}

document.querySelector(".close").addEventListener("click", closePhoto);
document.querySelector(".next").addEventListener("click", nextPhoto);
document.querySelector(".prev").addEventListener("click", previousPhoto);

lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
        closePhoto();
    }
});

document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) return;

    if (event.key === "Escape") closePhoto();
    if (event.key === "ArrowRight") nextPhoto();
    if (event.key === "ArrowLeft") previousPhoto();
});
