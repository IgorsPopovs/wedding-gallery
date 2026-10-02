const PHOTO_BASE_URL = "https://photos.aligor.us";
const GALLERY_BASE_PATH = "/wedding-gallery";
const BATCH_SIZE = 48;

const gallery = document.getElementById("gallery");
const galleryLoading = document.getElementById("gallery-loading");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxLoader = document.getElementById("lightbox-loader");
const lightboxError = document.getElementById("lightbox-error");

const closeButton = document.querySelector(".lightbox-close");
const previousButton = document.querySelector(".lightbox-prev");
const nextButton = document.querySelector(".lightbox-next");

const downloadBig = document.getElementById("download-big");
const downloadSmall = document.getElementById("download-small");
const downloadBigSize = document.getElementById("download-big-size");
const downloadSmallSize = document.getElementById("download-small-size");
const shareButton = document.getElementById("share-photo");
const shareStatus = document.getElementById("share-status");

const currentPhoto = document.getElementById("current-photo");
const totalPhotos = document.getElementById("total-photos");

let photos = [];
let renderedCount = 0;
let currentIndex = 0;
let downloadSizeRequestId = 0;
let shareStatusTimeout = null;
let isLoadingBatch = false;
let loadMoreObserver = null;

async function init() {
    if (!gallery) {
        return;
    }

    try {
        setLoadingText("Собираем наши воспоминания…");

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
            setLoadingText("Фотографии скоро появятся.");
            return;
        }

        await renderNextBatch();
        setupLoadMoreObserver();
        openSharedPhoto();

    } catch (error) {
        console.error(error);

        setLoadingText(
            "Не удалось загрузить фотографии. Попробуйте обновить страницу."
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

function showLightboxImage() {
    if (!lightboxImage) {
        return;
    }

    lightboxImage.classList.add("loaded");

    if (lightboxLoader) {
        lightboxLoader.classList.add("hidden");
    }

    if (lightboxError) {
        lightboxError.classList.add("hidden");
    }
}

function showLightboxImageError() {
    if (lightboxImage) {
        console.error("Не удалось загрузить фотографию:", lightboxImage.src);
        lightboxImage.classList.remove("loaded");
    }

    if (lightboxLoader) {
        lightboxLoader.classList.add("hidden");
    }

    if (lightboxError) {
        lightboxError.classList.remove("hidden");
    }
}

function loadLightboxImage(filename) {
    if (!lightboxImage) {
        return;
    }

    lightboxImage.classList.remove("loaded");

    if (lightboxLoader) {
        lightboxLoader.classList.remove("hidden");
    }

    if (lightboxError) {
        lightboxError.classList.add("hidden");
    }

    lightboxImage.alt = "Свадебная фотография " + (currentIndex + 1);
    lightboxImage.src = getSmallUrl(filename);

    if (lightboxImage.complete) {
        if (lightboxImage.naturalWidth > 0) {
            showLightboxImage();
        } else {
            showLightboxImageError();
        }
    }
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

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return (
            Math.round(bytes / 1024).toLocaleString("ru-RU") +
            " КБ"
        );
    }

    return (
        (bytes / (1024 * 1024)).toLocaleString(
            "ru-RU",
            {
                maximumFractionDigits: 1
            }
        ) +
        " МБ"
    );
}

async function loadDownloadSizes(filename) {
    const requestId = ++downloadSizeRequestId;

    if (downloadBigSize) {
        downloadBigSize.textContent = "";
    }

    if (downloadSmallSize) {
        downloadSmallSize.textContent = "";
    }

    try {
        const url = new URL(
            GALLERY_BASE_PATH + "/api/photo-sizes",
            window.location.origin
        );

        url.searchParams.set("filename", filename);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Не удалось получить размеры файлов");
        }

        const sizes = await response.json();

        if (requestId !== downloadSizeRequestId) {
            return;
        }

        if (downloadBigSize) {
            downloadBigSize.textContent =
                sizes.big === null
                    ? "размер недоступен"
                    : formatFileSize(sizes.big);
        }

        if (downloadSmallSize) {
            downloadSmallSize.textContent =
                sizes.small === null
                    ? "размер недоступен"
                    : formatFileSize(sizes.small);
        }
    } catch (error) {
        if (requestId !== downloadSizeRequestId) {
            return;
        }

        if (downloadBigSize) {
            downloadBigSize.textContent = "размер недоступен";
        }

        if (downloadSmallSize) {
            downloadSmallSize.textContent = "размер недоступен";
        }
    }
}

function showShareStatus(message) {
    if (!shareStatus) {
        return;
    }

    shareStatus.textContent = message;
    shareStatus.classList.add("visible");

    if (shareStatusTimeout) {
        clearTimeout(shareStatusTimeout);
    }

    shareStatusTimeout = setTimeout(
        function () {
            shareStatus.classList.remove("visible");
        },
        2600
    );
}

async function sharePhoto(filename) {
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = "photo=" + encodeURIComponent(filename);

    if (navigator.share) {
        try {
            await navigator.share({
                title: "Игорь и Алина — наша свадьба",
                text: "Фотография из нашей свадебной галереи",
                url: shareUrl.toString()
            });
            return;
        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }
        }
    }

    try {
        await navigator.clipboard.writeText(shareUrl.toString());
        showShareStatus("Ссылка на фото скопирована");
    } catch (error) {
        showShareStatus("Не удалось скопировать ссылку");
    }
}

function openSharedPhoto() {
    const filename =
        new URLSearchParams(window.location.hash.slice(1)).get("photo");

    if (!filename) {
        return;
    }

    const index = photos.indexOf(filename);

    if (index >= 0) {
        openLightbox(index);
    }
}

async function renderNextBatch() {
    if (
        !gallery ||
        isLoadingBatch ||
        renderedCount >= photos.length
    ) {
        return;
    }

    isLoadingBatch = true;

    setLoadingText("Собираем наши воспоминания…");

    const start = renderedCount;

    const end = Math.min(
        renderedCount + BATCH_SIZE,
        photos.length
    );

    const fragment =
        document.createDocumentFragment();

    for (let index = start; index < end; index++) {
        fragment.appendChild(
            createPhotoCard(
                photos[index],
                index
            )
        );
    }

    gallery.appendChild(fragment);

    renderedCount = end;
    isLoadingBatch = false;

    if (renderedCount >= photos.length) {
        finishLoading();
    } else {
        setLoadingText(
            "Листайте дальше — впереди ещё фотографии."
        );
        observeLastPhoto();
    }
}

function createPhotoCard(filename, index) {
    const card =
        document.createElement("article");

    const image =
        document.createElement("img");

    card.className = "photo-card";

    image.className = "thumbnail";

    image.src =
        getSmallUrl(filename);

    image.alt =
        "Свадебная фотография " +
        (index + 1);

    image.loading =
        index < 12
            ? "eager"
            : "lazy";

    image.decoding = "async";

    card.addEventListener(
        "click",
        function () {
            openLightbox(index);
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

    loadLightboxImage(filename);

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

    loadDownloadSizes(filename);

    lightbox.classList.add("active");

    lightbox.setAttribute(
        "aria-hidden",
        "false"
    );

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
        "active"
    );

    lightbox.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "lightbox-open"
    );

    downloadSizeRequestId += 1;

    if (new URLSearchParams(window.location.hash.slice(1)).has("photo")) {
        window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
        );
    }

    if (lightboxImage) {
        lightboxImage.classList.remove(
            "loaded"
        );

        lightboxImage.src = "";
    }
}

function updateLightboxImage() {
    const filename =
        photos[currentIndex];

    loadLightboxImage(filename);

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

    loadDownloadSizes(filename);
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

    updateLightboxImage();
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

    updateLightboxImage();
}

function updateNavigation() {
    const enabled =
        photos.length > 1;

    if (previousButton) {
        previousButton.disabled =
            !enabled;
    }

    if (nextButton) {
        nextButton.disabled =
            !enabled;
    }
}

if (lightboxImage) {
    lightboxImage.addEventListener(
        "load",
        showLightboxImage
    );

    lightboxImage.addEventListener(
        "error",
        showLightboxImageError
    );
}

if (closeButton) {
    closeButton.addEventListener(
        "click",
        function () {
            closeLightbox();
        }
    );
}

if (previousButton) {
    previousButton.addEventListener(
        "click",
        function () {
            showPrevious();
        }
    );
}

if (nextButton) {
    nextButton.addEventListener(
        "click",
        function () {
            showNext();
        }
    );
}

if (shareButton) {
    shareButton.addEventListener(
        "click",
        function () {
            const filename = photos[currentIndex];

            if (filename) {
                sharePhoto(filename);
            }
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
