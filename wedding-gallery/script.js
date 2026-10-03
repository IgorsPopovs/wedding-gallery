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
let swipeCloseTimeout = null;
const shareImagePromises = new Map();

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
    if (!lightboxImage || !lightboxImage.getAttribute("src")) {
        return;
    }

    console.error("Не удалось загрузить фотографию:", lightboxImage.src);
    lightboxImage.classList.remove("loaded");

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
    prepareShareImage(filename);

    if (lightboxImage.complete) {
        if (lightboxImage.naturalWidth > 0) {
            showLightboxImage();
        } else {
            showLightboxImageError();
        }
    }
}

function prepareShareImage(filename) {
    if (
        !navigator.canShare ||
        typeof File === "undefined" ||
        shareImagePromises.has(filename)
    ) {
        return;
    }

    const probe = new File([""], filename, { type: "image/jpeg" });
    if (!navigator.canShare({ files: [probe] })) {
        return;
    }

    const imagePromise = fetch(getSmallUrl(filename))
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Could not load the photo for sharing");
            }
            return response.blob();
        })
        .then(function (blob) {
            return new File([blob], filename, {
                type: blob.type || "image/jpeg"
            });
        });

    shareImagePromises.set(filename, imagePromise);
    imagePromise.catch(function () {
        shareImagePromises.delete(filename);
    });
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
        downloadBigSize.textContent = "\u00a0";
    }

    if (downloadSmallSize) {
        downloadSmallSize.textContent = "\u00a0";
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
    const photoNumber = filename.match(/(\d+)(?=\.[^.]+$)/);

    if (navigator.share) {
        try {
            const shareData = {
                title: "Игорь и Алина",
                text: "Игорь и Алина: фотография №" +
                    (photoNumber ? Number(photoNumber[1]) : ""),
                url: shareUrl.toString()
            };
            const imagePromise = shareImagePromises.get(filename);

            if (imagePromise) {
                try {
                    const file = await imagePromise;
                    if (navigator.canShare({ files: [file] })) {
                        shareData.files = [file];
                    }
                } catch (error) {
                    // Keep text-and-link sharing available if the image cannot be loaded.
                }
            }

            await navigator.share(shareData);
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
    const batchCards = [];

    for (let index = start; index < end; index++) {
        const card = createPhotoCard(photos[index], index);
        batchCards.push(card);
        fragment.appendChild(card);
    }

    gallery.appendChild(fragment);
    batchCards.forEach(updateMasonryCard);

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
    card.dataset.photoIndex = index;

    image.className = "thumbnail";

    image.alt =
        "Свадебная фотография " +
        (index + 1);

    image.loading =
        index < 12
            ? "eager"
            : "lazy";

    image.decoding = "async";
    image.addEventListener("load", function () {
        updateMasonryCard(card);
    });

    card.addEventListener(
        "click",
        function () {
            openLightbox(index);
        }
    );

    card.appendChild(image);
    image.src = getSmallUrl(filename);

    return card;
}

function updateMasonryCard(card) {
    const image = card.querySelector(".thumbnail");
    if (image) {
        const rowGap = parseFloat(getComputedStyle(gallery).rowGap) || 0;
        const imageHeight = image.naturalWidth > 0
            ? image.getBoundingClientRect().height
            : card.getBoundingClientRect().width * 0.75;
        card.style.gridRowEnd =
            "span " + Math.ceil(
                (imageHeight + rowGap) /
                (1 + rowGap)
            );
    }
}

window.addEventListener("resize", function () {
    if (!gallery) {
        return;
    }

    gallery.querySelectorAll(".photo-card").forEach(updateMasonryCard);
});

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

    if (swipeCloseTimeout) {
        clearTimeout(swipeCloseTimeout);
        swipeCloseTimeout = null;
    }
    lightbox.classList.remove("swipe-closing");

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

async function closeLightbox() {
    if (!lightbox) {
        return;
    }

    if (swipeCloseTimeout) {
        clearTimeout(swipeCloseTimeout);
        swipeCloseTimeout = null;
    }
    lightbox.classList.remove("swipe-closing");

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

    while (
        renderedCount <= currentIndex &&
        renderedCount < photos.length
    ) {
        await renderNextBatch();
    }

    const currentCard = gallery && gallery.querySelector(
        '[data-photo-index="' + currentIndex + '"]'
    );

    if (currentCard) {
        currentCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
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

let touchStartX = null;
let touchStartY = null;

if (lightbox) {
    lightbox.addEventListener(
        "touchstart",
        function (event) {
            if (lightbox.classList.contains("swipe-closing")) {
                touchStartX = null;
                touchStartY = null;
                return;
            }

            if (event.touches.length !== 1) {
                touchStartX = null;
                touchStartY = null;
                return;
            }

            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        },
        { passive: true }
    );

    lightbox.addEventListener(
        "touchend",
        function (event) {
            if (
                touchStartX === null ||
                !event.changedTouches.length
            ) {
                return;
            }

            const difference =
                touchStartX - event.changedTouches[0].clientX;
            const verticalDifference =
                touchStartY - event.changedTouches[0].clientY;

            touchStartX = null;
            touchStartY = null;

            if (
                window.matchMedia("(max-width: 680px)").matches &&
                verticalDifference < -80 &&
                -verticalDifference > Math.abs(difference)
            ) {
                lightbox.classList.add("swipe-closing");
                swipeCloseTimeout = setTimeout(function () {
                    swipeCloseTimeout = null;
                    closeLightbox();
                }, 180);
                return;
            }

            if (
                Math.abs(difference) < 50 ||
                Math.abs(difference) <= Math.abs(verticalDifference)
            ) {
                return;
            }

            if (difference > 0) {
                showNext();
            } else {
                showPrevious();
            }
        },
        { passive: true }
    );

    lightbox.addEventListener(
        "touchcancel",
        function () {
            touchStartX = null;
            touchStartY = null;
        },
        { passive: true }
    );
}

init();
