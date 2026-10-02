const PHOTO_BASE_URL = "https://photos.aligor.us";
const GALLERY_BASE_PATH = "/wedding-gallery";
const BATCH_SIZE = 48;

const gallery = document.getElementById("gallery");
const galleryLoading = document.getElementById("gallery-loading");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");

const closeButton = document.getElementById("lightbox-close");
const previousButton = document.getElementById("lightbox-prev");
const nextButton = document.getElementById("lightbox-next");

const downloadBig = document.getElementById("download-big");
const downloadSmall = document.getElementById("download-small");

const currentPhoto = document.getElementById("current-photo");
const totalPhotos = document.getElementById("total-photos");

let photos = [];
let renderedCount = 0;
let currentIndex = 0;
let isLoadingBatch = false;
let loadMoreObserver = null;

async function init() {
    if (!gallery) {
        console.error("Gallery element not found");
        return;
    }

    try {
        setLoadingText("Loading memories...");

        const response = await fetch(
            GALLERY_BASE_PATH + "/api/photos",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load photo list: " +
                response.status
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid photo list");
        }

        photos = data;

        if (totalPhotos) {
            totalPhotos.textContent = photos.length;
        }

        if (photos.length === 0) {
            setLoadingText("No photos found.");
            return;
        }

        await renderNextBatch();
        setupLoadMoreObserver();

    } catch (error) {
        console.error(error);

        setLoadingText(
            "Unable to load photos. Please try again later."
        );
    }
}

function getSmallUrl(filename) {
    return (
        PHOTO_BASE_URL +
        "/small/" +
        encodeURIComponent(filename)
    );
}

function getBigFilename(smallFilename) {
    return smallFilename.replace("_s_", "_b_");
}

function getBigDownloadUrl(smallFilename) {
    const bigFilename =
        getBigFilename(smallFilename);

    return (
        GALLERY_BASE_PATH +
        "/download/big/" +
        encodeURIComponent(bigFilename)
    );
}

function getSmallDownloadUrl(smallFilename) {
    return (
        GALLERY_BASE_PATH +
        "/download/small/" +
        encodeURIComponent(smallFilename)
    );
}

async function renderNextBatch() {
    if (!gallery || isLoadingBatch) {
        return;
    }

    if (renderedCount >= photos.length) {
        finishLoading();
        return;
    }

    isLoadingBatch = true;

    setLoadingText("Loading memories...");

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

    if (renderedCount >= photos.length) {
        finishLoading();
    } else {
        setLoadingText(
            "Scroll for more memories..."
        );
    }
}

function createPhotoCard(filename, index) {
    const card =
        document.createElement("article");

    card.className = "photo-card";
    card.dataset.index = index;

    card.addEventListener(
        "click",
        function () {
            openLightbox(index);
        }
    );

    const image =
        document.createElement("img");

    image.className = "thumbnail";

    image.src =
        getSmallUrl(filename);

    image.alt =
        "Wedding photo " + (index + 1);

    image.loading =
        index < 12
            ? "eager"
            : "lazy";

    image.decoding = "async";

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
    if (!loadMoreObserver || !gallery) {
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

    loadMoreObserver.observe(lastCard);
}

async function loadMorePhotos() {
    if (isLoadingBatch) {
        return;
    }

    await renderNextBatch();

    if (renderedCount < photos.length) {
        observeLastPhoto();
    }
}

function setLoadingText(text) {
    if (!galleryLoading) {
        return;
    }

    const textElement =
        galleryLoading.querySelector("p");

    if (textElement) {
        textElement.textContent = text;
    }

    galleryLoading.style.display = "";
}

function finishLoading() {
    if (galleryLoading) {
        galleryLoading.style.display = "none";
    }

    if (loadMoreObserver) {
        loadMoreObserver.disconnect();
    }
}

function openLightbox(index) {
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
        "Wedding photo " +
        (currentIndex + 1);

    if (currentPhoto) {
        currentPhoto.textContent =
            currentIndex + 1;
    }

    if (totalPhotos) {
        totalPhotos.textContent =
            photos.length;
    }

    if (downloadBig) {
        downloadBig.href =
            getBigDownloadUrl(filename);
    }

    if (downloadSmall) {
        downloadSmall.href =
            getSmallDownloadUrl(filename);
    }

    lightbox.classList.add("is-open");

    document.body.classList.add(
        "lightbox-open"
    );

    updateNavigation();
}

function closeLightbox() {
    if (!lightbox) {
        return;
    }

    lightbox.classList.remove(
        "is-open"
    );

    document.body.classList.remove(
        "lightbox-open"
    );

    if (lightboxImage) {
        lightboxImage.src = "";
    }
}

function showPrevious() {
    if (photos.length === 0) {
        return;
    }

    currentIndex =
        (
            currentIndex -
            1 +
            photos.length
        ) %
        photos.length;

    updateLightbox();
}

function showNext() {
    if (photos.length === 0) {
        return;
    }

    currentIndex =
        (
            currentIndex +
            1
        ) %
        photos.length;

    updateLightbox();
}

function updateLightbox() {
    if (!lightboxImage) {
        return;
    }

    const filename =
        photos[currentIndex];

    lightboxImage.src =
        getSmallUrl(filename);

    lightboxImage.alt =
        "Wedding photo " +
        (currentIndex + 1);

    if (currentPhoto) {
        currentPhoto.textContent =
            currentIndex + 1;
    }

    if (downloadBig) {
        downloadBig.href =
            getBigDownloadUrl(filename);
    }

    if (downloadSmall) {
        downloadSmall.href =
            getSmallDownloadUrl(filename);
    }

    updateNavigation();
}

function updateNavigation() {
    const hasMultiplePhotos =
        photos.length > 1;

    if (previousButton) {
        previousButton.disabled =
            !hasMultiplePhotos;
    }

    if (nextButton) {
        nextButton.disabled =
            !hasMultiplePhotos;
    }
}

document.addEventListener(
    "keydown",
    function (event) {
        if (
            !lightbox ||
            !lightbox.classList.contains(
                "is-open"
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

if (closeButton) {
    closeButton.addEventListener(
        "click",
        closeLightbox
    );
}

if (previousButton) {
    previousButton.addEventListener(
        "click",
        showPrevious
    );
}

if (nextButton) {
    nextButton.addEventListener(
        "click",
        showNext
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

let touchStartX = 0;
let touchEndX = 0;

if (lightboxImage) {
    lightboxImage.addEventListener(
        "touchstart",
        function (event) {
            touchStartX =
                event.changedTouches[0]
                    .screenX;
        },
        {
            passive: true
        }
    );

    lightboxImage.addEventListener(
        "touchend",
        function (event) {
            touchEndX =
                event.changedTouches[0]
                    .screenX;

            const difference =
                touchStartX -
                touchEndX;

            if (
                Math.abs(difference) < 50
            ) {
                return;
            }

            if (difference > 0) {
                showNext();
            } else {
                showPrevious();
            }
        },
        {
            passive: true
        }
    );
}

init();