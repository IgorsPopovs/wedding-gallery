const PHOTO_BASE_URL = "https://photos.aligor.us";
const GALLERY_BASE_PATH = "/wedding-gallery";
const BATCH_SIZE = 48;

const gallery = document.getElementById("gallery");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");

const downloadBig = document.getElementById("download-big");
const downloadSmall = document.getElementById("download-small");

const closeButton = document.querySelector(".close");
const previousButton = document.querySelector(".prev");
const nextButton = document.querySelector(".next");

let photos = [];
let renderedCount = 0;
let currentIndex = 0;
let isLoadingBatch = false;
let loadMoreObserver = null;

async function init() {
    try {
        const response = await fetch(
            GALLERY_BASE_PATH + "/api/photos",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load photos: " +
                response.status
            );
        }

        photos = await response.json();

        if (!Array.isArray(photos)) {
            throw new Error("Invalid photo list");
        }

        if (photos.length === 0) {
            return;
        }

        await renderNextBatch();
        setupLoadMoreObserver();

    } catch (error) {
        console.error(error);
    }
}

function getSmallUrl(filename) {
    return (
        PHOTO_BASE_URL +
        "/small/" +
        encodeURIComponent(filename)
    );
}

function getBigFilename(filename) {
    return filename.replace("_s_", "_b_");
}

function getBigDownloadUrl(filename) {
    return (
        GALLERY_BASE_PATH +
        "/download/big/" +
        encodeURIComponent(
            getBigFilename(filename)
        )
    );
}

function getSmallDownloadUrl(filename) {
    return (
        GALLERY_BASE_PATH +
        "/download/small/" +
        encodeURIComponent(filename)
    );
}

async function renderNextBatch() {
    if (isLoadingBatch) {
        return;
    }

    if (renderedCount >= photos.length) {
        return;
    }

    isLoadingBatch = true;

    const start = renderedCount;

    const end = Math.min(
        renderedCount + BATCH_SIZE,
        photos.length
    );

    const fragment =
        document.createDocumentFragment();

    for (let index = start; index < end; index++) {
        const card = createPhotoCard(
            photos[index],
            index
        );

        fragment.appendChild(card);
    }

    gallery.appendChild(fragment);

    renderedCount = end;
    isLoadingBatch = false;

    if (renderedCount < photos.length) {
        observeLastPhoto();
    }
}

function createPhotoCard(filename, index) {
    const card =
        document.createElement("div");

    const image =
        document.createElement("img");

    card.className = "photo-card";

    image.className = "thumbnail";

    image.src =
        getSmallUrl(filename);

    image.alt =
        "Wedding photo " +
        (index + 1);

    image.loading =
        index < 12
            ? "eager"
            : "lazy";

    image.decoding = "async";

    card.addEventListener(
        "click",
        function () {
            openPhoto(index);
        }
    );

    card.appendChild(image);

    return card;
}

function setupLoadMoreObserver() {
    if (
        !("IntersectionObserver" in window)
    ) {
        return;
    }

    loadMoreObserver =
        new IntersectionObserver(
            function (entries) {
                for (const entry of entries) {
                    if (
                        entry.isIntersecting &&
                        renderedCount < photos.length
                    ) {
                        loadMorePhotos();
                    }
                }
            },
            {
                root: null,
                rootMargin: "1200px 0px",
                threshold: 0
            }
        );

    observeLastPhoto();
}

function observeLastPhoto() {
    if (
        !loadMoreObserver ||
        !gallery
    ) {
        return;
    }

    const cards =
        gallery.querySelectorAll(
            ".photo-card"
        );

    if (cards.length === 0) {
        return;
    }

    const lastCard =
        cards[cards.length - 1];

    loadMoreObserver.disconnect();

    loadMoreObserver.observe(
        lastCard
    );
}

async function loadMorePhotos() {
    if (isLoadingBatch) {
        return;
    }

    await renderNextBatch();
}

function openPhoto(index) {
    if (
        !lightbox ||
        !lightboxImage ||
        index < 0 ||
        index >= photos.length
    ) {
        return;
    }

    currentIndex = index;

    const filename =
        photos[currentIndex];

    lightboxImage.src =
        getSmallUrl(filename);

    lightboxImage.alt =
        filename;

    downloadBig.href =
        getBigDownloadUrl(filename);

    downloadBig.download =
        getBigFilename(filename);

    downloadSmall.href =
        getSmallDownloadUrl(filename);

    downloadSmall.download =
        filename;

    lightbox.classList.add(
        "active"
    );
}

function closeLightbox() {
    if (!lightbox) {
        return;
    }

    lightbox.classList.remove(
        "active"
    );

    if (lightboxImage) {
        lightboxImage.src = "";
    }
}

function showPrevious() {
    if (photos.length === 0) {
        return;
    }

    openPhoto(
        (
            currentIndex -
            1 +
            photos.length
        ) % photos.length
    );
}

function showNext() {
    if (photos.length === 0) {
        return;
    }

    openPhoto(
        (
            currentIndex +
            1
        ) % photos.length
    );
}

if (closeButton) {
    closeButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();
            closeLightbox();
        }
    );
}

if (previousButton) {
    previousButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();
            showPrevious();
        }
    );
}

if (nextButton) {
    nextButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();
            showNext();
        }
    );
}

if (lightbox) {
    lightbox.addEventListener(
        "click",
        function (event) {
            if (
                event.target === lightbox
            ) {
                closeLightbox();
            }
        }
    );
}

document.addEventListener(
    "keydown",
    function (event) {
        if (
            !lightbox ||
            !lightbox.classList.contains(
                "active"
            )
        ) {
            return;
        }

        if (event.key === "Escape") {
            closeLightbox();
        }

        if (event.key === "ArrowLeft") {
            showPrevious();
        }

        if (event.key === "ArrowRight") {
            showNext();
        }
    }
);

init();