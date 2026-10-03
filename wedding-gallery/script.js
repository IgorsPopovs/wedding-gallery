const PHOTO_BASE_URL = "https://photos.aligor.us";
const GALLERY_BASE_PATH = "/wedding-gallery";
const BATCH_SIZE = 48;
const FAVORITES_STORAGE_KEY = "wedding-gallery-favorites-v1";

const gallery = document.getElementById("gallery");
const galleryLoading = document.getElementById("gallery-loading");
const favoritesToggle = document.getElementById("favorites-toggle");
const favoritesCount = document.getElementById("favorites-count");

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
const lightboxFavoriteButton = document.getElementById("lightbox-favorite");
const deletePhotoButton = document.getElementById("delete-photo");
const shareStatus = document.getElementById("share-status");

const currentPhoto = document.getElementById("current-photo");
const totalPhotos = document.getElementById("total-photos");

let photos = [];
let favoritePhotos = loadFavoritePhotos();
let visiblePhotoIndices = [];
let favoritesOnly = false;
const adminMode = new URLSearchParams(window.location.search).get("admin") === "1";
let renderedCount = 0;
let currentIndex = 0;
let downloadSizeRequestId = 0;
let shareStatusTimeout = null;
let isLoadingBatch = false;
let loadMoreObserver = null;
let swipeCloseTimeout = null;
const shareImagePromises = new Map();

if (deletePhotoButton && adminMode) {
    deletePhotoButton.hidden = false;
}

function clearSwipeVisual() {
    if (!lightbox) {
        return;
    }

    lightbox.classList.remove("swipe-following", "swipe-closing");
    lightbox.style.removeProperty("--swipe-offset-y");
    lightbox.style.removeProperty("--swipe-scale");
    lightbox.style.removeProperty("--swipe-image-opacity");
    lightbox.style.removeProperty("--swipe-overlay-opacity");
}

function updateSwipeVisual(distance) {
    const progress = Math.min(distance / 220, 1);

    lightbox.style.setProperty("--swipe-offset-y", distance + "px");
    lightbox.style.setProperty("--swipe-scale", 1 - progress * 0.035);
    lightbox.style.setProperty("--swipe-image-opacity", 1 - progress * 0.65);
    lightbox.style.setProperty("--swipe-overlay-opacity", 1 - progress * 0.3);
    lightbox.classList.add("swipe-following");
}

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
        favoritePhotos = new Set(
            [...favoritePhotos].filter(function (filename) {
                return photos.includes(filename);
            })
        );
        visiblePhotoIndices = getVisiblePhotoIndices();
        updateFavoritesControls();

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

function loadFavoritePhotos() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]"
        );
        return new Set(
            Array.isArray(saved)
                ? saved.filter(function (filename) {
                    return typeof filename === "string";
                })
                : []
        );
    } catch (error) {
        return new Set();
    }
}

function getVisiblePhotoIndices() {
    const indices = [];
    for (let index = 0; index < photos.length; index++) {
        if (!favoritesOnly || favoritePhotos.has(photos[index])) {
            indices.push(index);
        }
    }
    return indices;
}

function updateFavoritesControls() {
    if (favoritesCount) {
        favoritesCount.textContent = favoritePhotos.size;
    }
    if (favoritesToggle) {
        favoritesToggle.setAttribute("aria-pressed", String(favoritesOnly));
        favoritesToggle.setAttribute(
            "aria-label",
            favoritesOnly ? "Показать все фотографии" : "Показать избранные фотографии"
        );
    }
    if (lightboxFavoriteButton && photos[currentIndex]) {
        const isFavorite = favoritePhotos.has(photos[currentIndex]);
        lightboxFavoriteButton.setAttribute("aria-pressed", String(isFavorite));
        lightboxFavoriteButton.setAttribute(
            "aria-label",
            isFavorite ? "Убрать из избранного" : "Добавить в избранное"
        );
        lightboxFavoriteButton.title = isFavorite ? "Убрать из избранного" : "В избранное";
    }
    if (lightbox?.classList.contains("active")) {
        updateNavigation();
    }
}

function updateFavoriteButton(button, filename) {
    const isFavorite = favoritePhotos.has(filename);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute(
        "aria-label",
        isFavorite ? "Убрать из избранного" : "Добавить в избранное"
    );
    button.title = isFavorite ? "Убрать из избранного" : "В избранное";
}

function toggleFavorite(filename) {
    if (favoritePhotos.has(filename)) {
        favoritePhotos.delete(filename);
    } else {
        favoritePhotos.add(filename);
    }

    try {
        localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify([...favoritePhotos])
        );
    } catch (error) {
        showShareStatus("Не удалось сохранить избранное в этом браузере");
    }

    updateFavoritesControls();

    if (favoritesOnly) {
        renderGalleryFromStart();
        return;
    }

    gallery?.querySelectorAll(".favorite-button").forEach(function (button) {
        const card = button.closest(".photo-card");
        const index = Number(card?.dataset.photoIndex);
        if (Number.isInteger(index) && photos[index]) {
            updateFavoriteButton(button, photos[index]);
        }
    });
}

function saveFavoritePhotos() {
    try {
        localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify([...favoritePhotos])
        );
    } catch (error) {
        showShareStatus("Не удалось сохранить избранное в этом браузере");
    }
}

async function deleteCurrentPhoto() {
    const filename = photos[currentIndex];
    if (!filename || !adminMode) {
        return;
    }

    const number = filename.match(/(\d+)(?=\.[^.]+$)/);
    const photoLabel = number ? "№" + Number(number[1]) : filename;
    if (!window.confirm(
        "Удалить фотографию " + photoLabel + " из галереи?\n\nБудут удалены и маленькая, и большая версии. Это действие нельзя отменить."
    )) {
        return;
    }

    let token = sessionStorage.getItem("wedding-gallery-admin-token");
    if (!token) {
        token = window.prompt("Введите временный токен администратора для удаления:");
        if (!token) {
            return;
        }
        sessionStorage.setItem("wedding-gallery-admin-token", token);
    }

    try {
        const response = await fetch(
            GALLERY_BASE_PATH + "/api/delete-photo?filename=" + encodeURIComponent(filename),
            {
                method: "DELETE",
                headers: { "Authorization": "Bearer " + token }
            }
        );

        if (response.status === 401) {
            sessionStorage.removeItem("wedding-gallery-admin-token");
            showShareStatus("Токен не принят. Обновите страницу и попробуйте снова.");
            return;
        }
        if (response.status === 503) {
            showShareStatus("Сначала настройте секрет GALLERY_ADMIN_TOKEN у Worker");
            return;
        }
        if (!response.ok) {
            throw new Error("Delete failed: " + response.status);
        }

        await closeLightbox();
        photos = photos.filter(function (photo) {
            return photo !== filename;
        });
        favoritePhotos.delete(filename);
        saveFavoritePhotos();
        updateFavoritesControls();
        await renderGalleryFromStart();
        showShareStatus("Фото и обе версии удалены");
    } catch (error) {
        console.error(error);
        showShareStatus("Не удалось удалить фото. Попробуйте ещё раз.");
    }
}

async function renderGalleryFromStart() {
    if (!gallery) {
        return;
    }

    if (loadMoreObserver) {
        loadMoreObserver.disconnect();
    }
    gallery.replaceChildren();
    renderedCount = 0;
    visiblePhotoIndices = getVisiblePhotoIndices();

    if (visiblePhotoIndices.length === 0) {
        setLoadingText(
            favoritesOnly
                ? "Пока нет избранных фотографий. Нажмите на сердечко у понравившегося кадра."
                : "Фотографии скоро появятся."
        );
        galleryLoading?.classList.add("empty");
        return;
    }

    galleryLoading?.classList.remove("empty");
    await renderNextBatch();
    setupLoadMoreObserver();
}

function getSmallUrl(filename) {
    return (
        PHOTO_BASE_URL +
        "/small/" +
        encodeURIComponent(filename)
    );
}

function getShareImageUrl(filename) {
    return (
        GALLERY_BASE_PATH +
        "/api/share-photo?filename=" +
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

    const imagePromise = fetch(getShareImageUrl(filename))
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
    const shareText = "Игорь и Алина: фотография №" +
        (photoNumber ? Number(photoNumber[1]) : "");
    const shareMessage = shareText + " " + shareUrl.toString();

    if (navigator.share) {
        try {
            let shareData = {
                title: "Игорь и Алина",
                text: shareMessage
            };
            const imagePromise = shareImagePromises.get(filename);

            if (imagePromise) {
                try {
                    const file = await imagePromise;
                    const imageShareData = {
                        title: "Игорь и Алина",
                        text: shareMessage,
                        files: [file]
                    };
                    if (navigator.canShare(imageShareData)) {
                        shareData = imageShareData;
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
        await navigator.clipboard.writeText(shareMessage);
        showShareStatus("Текст и ссылка скопированы");
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
        renderedCount >= visiblePhotoIndices.length
    ) {
        return;
    }

    isLoadingBatch = true;

    setLoadingText(
        favoritesOnly ? "Показываем избранное…" : "Собираем наши воспоминания…"
    );
    galleryLoading?.classList.remove("empty");

    const start = renderedCount;

    const end = Math.min(
        renderedCount + BATCH_SIZE,
        visiblePhotoIndices.length
    );

    const fragment =
        document.createDocumentFragment();
    const batchCards = [];

    for (let position = start; position < end; position++) {
        const index = visiblePhotoIndices[position];
        const card = createPhotoCard(photos[index], index);
        batchCards.push(card);
        fragment.appendChild(card);
    }

    gallery.appendChild(fragment);
    batchCards.forEach(updateMasonryCard);

    renderedCount = end;
    isLoadingBatch = false;

    if (renderedCount >= visiblePhotoIndices.length) {
        finishLoading();
    } else {
        setLoadingText(
            favoritesOnly
                ? "Листайте дальше — в избранном есть ещё фотографии."
                : "Листайте дальше — впереди ещё фотографии."
        );
        observeLastPhoto();
    }
}

function createPhotoCard(filename, index) {
    const card =
        document.createElement("article");

    const image =
        document.createElement("img");
    const favoriteButton = document.createElement("button");

    card.className = "photo-card";
    card.dataset.photoIndex = index;

    favoriteButton.type = "button";
    favoriteButton.className = "favorite-button";
    favoriteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.9c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.8Z" /></svg>';
    updateFavoriteButton(favoriteButton, filename);
    favoriteButton.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleFavorite(filename);
    });

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
    card.appendChild(favoriteButton);
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
                        renderedCount < visiblePhotoIndices.length
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
    galleryLoading.classList.toggle("empty", text.startsWith("Пока нет избранных"));

    galleryLoading.style.display = "";
}

function finishLoading() {
    if (galleryLoading) {
        galleryLoading.style.display = "none";
    }

    if (loadMoreObserver) {
        loadMoreObserver.disconnect();
    }
    galleryLoading?.classList.remove("empty");
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
    updateFavoritesControls();

    if (swipeCloseTimeout) {
        clearTimeout(swipeCloseTimeout);
        swipeCloseTimeout = null;
    }
    clearSwipeVisual();

    const filename =
        photos[currentIndex];

    loadLightboxImage(filename);

    if (currentPhoto) {
        const position = visiblePhotoIndices.indexOf(currentIndex);
        currentPhoto.textContent = position >= 0 ? position + 1 : currentIndex + 1;
    }

    if (totalPhotos) {
        totalPhotos.textContent = visiblePhotoIndices.length;
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
    clearSwipeVisual();

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

    const currentPosition = visiblePhotoIndices.indexOf(currentIndex);
    while (
        currentPosition >= 0 &&
        renderedCount <= currentPosition &&
        renderedCount < visiblePhotoIndices.length
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
    updateFavoritesControls();

    if (currentPhoto) {
        const position = visiblePhotoIndices.indexOf(currentIndex);
        currentPhoto.textContent = position >= 0 ? position + 1 : currentIndex + 1;
    }
    if (totalPhotos) {
        totalPhotos.textContent = visiblePhotoIndices.length;
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
    if (visiblePhotoIndices.length === 0) {
        return;
    }

    const position = visiblePhotoIndices.indexOf(currentIndex);
    const previousPosition = position < 0
        ? visiblePhotoIndices.length - 1
        : (position - 1 + visiblePhotoIndices.length) % visiblePhotoIndices.length;
    currentIndex = visiblePhotoIndices[previousPosition];

    updateLightboxImage();
}

function showNext() {
    if (visiblePhotoIndices.length === 0) {
        return;
    }

    const position = visiblePhotoIndices.indexOf(currentIndex);
    const nextPosition = position < 0
        ? 0
        : (position + 1) % visiblePhotoIndices.length;
    currentIndex = visiblePhotoIndices[nextPosition];

    updateLightboxImage();
}

function updateNavigation() {
    const enabled =
        visiblePhotoIndices.length > 1;

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

if (favoritesToggle) {
    favoritesToggle.addEventListener("click", function () {
        favoritesOnly = !favoritesOnly;
        updateFavoritesControls();
        renderGalleryFromStart();
    });
}

if (lightboxFavoriteButton) {
    lightboxFavoriteButton.addEventListener("click", function () {
        const filename = photos[currentIndex];
        if (filename) {
            toggleFavorite(filename);
        }
    });
}

if (deletePhotoButton) {
    deletePhotoButton.addEventListener("click", deleteCurrentPhoto);
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
                clearSwipeVisual();
                return;
            }

            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        },
        { passive: true }
    );

    lightbox.addEventListener(
        "touchmove",
        function (event) {
            if (
                touchStartX === null ||
                event.touches.length !== 1 ||
                !window.matchMedia("(max-width: 680px)").matches
            ) {
                return;
            }

            const deltaX = event.touches[0].clientX - touchStartX;
            const deltaY = event.touches[0].clientY - touchStartY;

            if (deltaY > 0 && deltaY > Math.abs(deltaX)) {
                updateSwipeVisual(deltaY);
            } else if (lightbox.classList.contains("swipe-following")) {
                clearSwipeVisual();
            }
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
                updateSwipeVisual(-verticalDifference);
                lightbox.classList.remove("swipe-following");
                lightbox.classList.add("swipe-closing");
                swipeCloseTimeout = setTimeout(function () {
                    swipeCloseTimeout = null;
                    closeLightbox();
                }, 180);
                return;
            }

            clearSwipeVisual();

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
            clearSwipeVisual();
        },
        { passive: true }
    );
}

init();
