const PHOTO_BASE_URL = "https://photos.aligor.us";
const GALLERY_BASE_PATH = "/wedding-gallery";
const BATCH_SIZE = 48;
const FAVORITES_STORAGE_KEY = "wedding-gallery-favorites-v1";
const GUEST_AVATARS = {
    "kristaps-kalns": "images/guests/kristaps-kalns.jpg",
    "alina-maf": "images/guests/alina-maf.jpg",
    "alina-saf": "images/guests/alina-saf.jpg",
    alexey: "images/guests/alexey.jpg",
    anzhela: "images/guests/anzhela.jpg",
    artem: "images/guests/artem.jpg",
    artur: "images/guests/artur.jpg",
    "kristina-filipp": "images/guests/kristina-filipp.jpg",
    diana: "images/guests/diana.jpg",
    leonid: "images/guests/leonid.jpg",
    max: "images/guests/max.jpg",
    "daniel-danika": "images/guests/daniel-danika.jpg",
    "babushka-valentina": "images/guests/babushka-valentina.jpg",
    "dmitry-leonov": "images/guests/dmitry-leonov.jpg",
    "dasha-leonova": "images/guests/dasha-leonova.jpg",
    "babushka-larisa": "images/guests/babushka-larisa.jpg",
    misha: "images/guests/misha.jpg",
    valentin: "images/guests/valentin.jpg",
    valeria: "images/guests/valeria.jpg"
};
const PEOPLE = [
    { id: "igor-zorya-groom", name: "Игорь Зоря (жених)" },
    { id: "alina-zorya-bride", name: "Алина Зоря (невеста)" },
    { id: "kristaps-kalns", name: "Kristaps Kalns" },
    { id: "alexander-farbtukh", name: "Александр Фарбтух" },
    { id: "alexandra-farbtukh", name: "Александра Фарбтух" },
    { id: "alina-maf", name: "Алина Маф" },
    { id: "zhenya", name: "Женя" },
    { id: "alina-saf", name: "Алина Саф" },
    { id: "valentin", name: "Валентин" },
    { id: "artem", name: "Артем" },
    { id: "anzhela", name: "Анжела" },
    { id: "artur", name: "Артур" },
    { id: "babushka-larisa", name: "Бабушка Лариса" },
    { id: "babushka-valentina", name: "Бабушка Валентина" },
    { id: "valeriy-farbtukh", name: "Валерий Фарбтух" },
    { id: "alexandra-romanovskaya", name: "Александра Романовская" },
    { id: "daniel-danika", name: "Даниель" },
    { id: "darya-danika", name: "Дарья Даника" },
    { id: "diana", name: "Диана" },
    { id: "alexey", name: "Алексей" },
    { id: "dmitry-leonov", name: "Дмитрий Леонов" },
    { id: "dasha-leonova", name: "Даша Леонова" },
    { id: "kristina-mogilevtseva", name: "Кристина Могилевцева" },
    { id: "leonid", name: "Леонид" },
    { id: "max", name: "Макс" },
    { id: "valeria", name: "Валерия" },
    { id: "mom-natalia-u", name: "Мама Наталья У" },
    { id: "mom-natalia-p", name: "Мама Наталья П" },
    { id: "olya", name: "Оля" },
    { id: "misha", name: "Миша" },
    { id: "papa", name: "Папа" },
    { id: "kristina-papa", name: "Кристина папы" },
    { id: "tatyana", name: "Татьяна" },
    { id: "vladimir", name: "Владимир" },
    { id: "filipp", name: "Филипп" },
    { id: "kristina-filipp", name: "Кристина Филиппа" },
    { id: "eduard", name: "Эдуард" },
    { id: "alexandra-leonova", name: "Александра Леонова" }
];

const gallery = document.getElementById("gallery");
const galleryLoading = document.getElementById("gallery-loading");
const galleryPhotoCount = document.getElementById("gallery-photo-count");
const favoritesToggle = document.getElementById("favorites-toggle");
const favoritesCount = document.getElementById("favorites-count");
const guestFilters = document.getElementById("guest-filters");
const guestFiltersCollapse = document.getElementById("guest-filters-collapse");
const clearGuestFilters = document.getElementById("clear-guest-filters");
const guestFilterSummary = document.getElementById("guest-filter-summary");
let guestFiltersExpanded = false;
const untaggedPhotosToggle = document.getElementById("untagged-photos-toggle");

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
const photoPeopleEditor = document.getElementById("photo-people-editor");
const photoPeopleBackdrop = document.querySelector(".photo-people-backdrop");
const photoPeoplePopup = document.querySelector(".photo-people-popup");
const photoPeopleChoices = document.getElementById("photo-people-choices");
const savePhotoPeopleButton = document.getElementById("save-photo-people");
const photoPeopleStatus = document.getElementById("photo-people-status");

const currentPhoto = document.getElementById("current-photo");
const totalPhotos = document.getElementById("total-photos");

let photos = [];
let photoTags = {};
let selectedPeople = new Set();
let editablePhotoPeople = new Set();
let favoritePhotos = loadFavoritePhotos();
let visiblePhotoIndices = [];
let favoritesOnly = false;
let untaggedPhotosOnly = false;
const adminMode = new URLSearchParams(window.location.search).get("admin") === "1";
let renderedCount = 0;
let currentIndex = 0;
let downloadSizeRequestId = 0;
let shareStatusTimeout = null;
let isLoadingBatch = false;
let loadMoreObserver = null;
let isWaitingForMorePhotos = false;
let isFinishingGalleryVersion = null;
let galleryRenderVersion = 0;
let cancelPendingImageWait = null;
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
        try {
            const tagsResponse = await fetch(GALLERY_BASE_PATH + "/api/photo-tags", { cache: "no-store" });
            if (tagsResponse.ok) {
                const tags = await tagsResponse.json();
                if (tags && typeof tags === "object" && !Array.isArray(tags)) photoTags = tags;
            }
        } catch (error) {
            console.warn("Could not load guest photo tags", error);
        }
        renderGuestFilters();
        if (untaggedPhotosToggle) untaggedPhotosToggle.hidden = !adminMode;
        if (photoPeopleEditor) photoPeopleEditor.hidden = !adminMode;
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
        updateGalleryPhotoCount();

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
        const tags = photoTags[photos[index]] || [];
        const matchesPeople = selectedPeople.size === 0 ||
            [...selectedPeople].some(function (id) { return tags.includes(id); });
        const matchesUntagged = !untaggedPhotosOnly || tags.length === 0;
        if ((!favoritesOnly || favoritePhotos.has(photos[index])) && matchesPeople && matchesUntagged) {
            indices.push(index);
        }
    }
    return indices;
}

function updateGalleryPhotoCount() {
    if (!galleryPhotoCount) return;

    const formattedTotal = photos.length.toLocaleString("ru-RU");
    const hasActiveFilter = selectedPeople.size > 0 || favoritesOnly || untaggedPhotosOnly;
    galleryPhotoCount.textContent = hasActiveFilter
        ? "Фотографий: " + getVisiblePhotoIndices().length.toLocaleString("ru-RU") + " из " + formattedTotal
        : "Всего фотографий: " + formattedTotal;
}

function getFavoriteCountForCurrentFilters() {
    return photos.reduce(function (count, filename) {
        if (!favoritePhotos.has(filename)) return count;

        const tags = photoTags[filename] || [];
        const matchesPeople = selectedPeople.size === 0 ||
            [...selectedPeople].some(function (id) { return tags.includes(id); });
        const matchesUntagged = !untaggedPhotosOnly || tags.length === 0;
        return matchesPeople && matchesUntagged ? count + 1 : count;
    }, 0);
}

function getGuestPhotoCounts() {
    const counts = new Map(PEOPLE.map(function (person) {
        return [person.id, 0];
    }));

    photos.forEach(function (filename) {
        new Set(photoTags[filename] || []).forEach(function (personId) {
            if (counts.has(personId)) counts.set(personId, counts.get(personId) + 1);
        });
    });

    return counts;
}

function renderGuestFilters() {
    if (!guestFilters) return;
    guestFilters.replaceChildren();
    guestFilters.classList.toggle("is-collapsed", !guestFiltersExpanded);
    guestFilters.classList.toggle("is-expanded", guestFiltersExpanded);
    if (guestFiltersCollapse) guestFiltersCollapse.hidden = !guestFiltersExpanded;
    const guestPhotoCounts = adminMode ? getGuestPhotoCounts() : null;
    const orderedPeople = [...PEOPLE].sort(function (a, b) {
        const selectedDifference = Number(selectedPeople.has(b.id)) - Number(selectedPeople.has(a.id));
        if (selectedDifference) return selectedDifference;
        if (!guestFiltersExpanded) {
            return Number(Boolean(GUEST_AVATARS[b.id])) - Number(Boolean(GUEST_AVATARS[a.id]));
        }
        return 0;
    });
    const visiblePeople = guestFiltersExpanded ? orderedPeople : orderedPeople.slice(0, 3);
    visiblePeople.forEach(function (person, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "guest-filter";
        button.dataset.personId = person.id;
        if (!guestFiltersExpanded) button.style.zIndex = String(index + 1);
        if (GUEST_AVATARS[person.id]) {
            button.classList.add("has-avatar");
            button.setAttribute("aria-label", person.name);
            const avatar = document.createElement("img");
            avatar.className = "guest-filter-avatar";
            avatar.src = GUEST_AVATARS[person.id];
            avatar.alt = "";
            avatar.loading = "lazy";
            avatar.decoding = "async";
            button.append(avatar);
        }
        const name = document.createElement("span");
        name.className = "guest-filter-name";
        name.textContent = person.name;
        button.append(name);
        if (guestPhotoCounts) {
            const count = document.createElement("span");
            count.className = "guest-filter-count";
            count.textContent = guestPhotoCounts.get(person.id).toLocaleString("ru-RU");
            count.setAttribute("aria-label", guestPhotoCounts.get(person.id) + " фотографий");
            button.append(count);
        }
        button.setAttribute("aria-pressed", String(selectedPeople.has(person.id)));
        button.addEventListener("click", function () {
            if (selectedPeople.has(person.id)) selectedPeople.delete(person.id);
            else selectedPeople.add(person.id);
            untaggedPhotosOnly = false;
            renderGuestFilters();
            renderGalleryFromStart();
        });
        guestFilters.append(button);
    });
    if (!guestFiltersExpanded && PEOPLE.length > visiblePeople.length) {
        const expand = document.createElement("button");
        expand.type = "button";
        expand.className = "guest-filters-more";
        expand.textContent = "+" + (PEOPLE.length - visiblePeople.length);
        expand.setAttribute("aria-label", "Показать всех гостей");
        expand.setAttribute("aria-expanded", "false");
        expand.style.zIndex = String(visiblePeople.length + 1);
        expand.addEventListener("click", function () {
            guestFiltersExpanded = true;
            renderGuestFilters();
        });
        guestFilters.append(expand);
    }
    if (guestFiltersCollapse) {
        guestFiltersCollapse.onclick = function () {
            guestFiltersExpanded = false;
            renderGuestFilters();
        };
    }
    if (untaggedPhotosToggle) {
        untaggedPhotosToggle.setAttribute("aria-pressed", String(untaggedPhotosOnly));
    }
    if (clearGuestFilters) clearGuestFilters.hidden = selectedPeople.size === 0 && !untaggedPhotosOnly;
    if (guestFilterSummary) {
        const count = getVisiblePhotoIndices().length;
        guestFilterSummary.textContent = untaggedPhotosOnly
            ? count.toLocaleString("ru-RU") + " фотографий без отметок гостей"
            : selectedPeople.size
            ? count.toLocaleString("ru-RU") + " фотографий с выбранными гостями"
            : "Выбери гостя, чтобы найти фотографии";
    }
    updateGalleryPhotoCount();
    if (favoritesCount) {
        favoritesCount.textContent = getFavoriteCountForCurrentFilters();
    }
}

function renderPhotoPeopleChoices() {
    if (!photoPeopleChoices) return;
    photoPeopleChoices.replaceChildren();
    PEOPLE.forEach(function (person) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "photo-person-choice";
        button.textContent = person.name;
        button.setAttribute("aria-pressed", String(editablePhotoPeople.has(person.id)));
        button.addEventListener("click", function () {
            if (editablePhotoPeople.has(person.id)) editablePhotoPeople.delete(person.id);
            else editablePhotoPeople.add(person.id);
            renderPhotoPeopleChoices();
        });
        photoPeopleChoices.append(button);
    });
}

function preparePhotoPeopleEditor() {
    if (!photoPeopleEditor || !adminMode) return;
    photoPeoplePopup?.classList.remove("is-saved");
    editablePhotoPeople = new Set(photoTags[photos[currentIndex]] || []);
    if (photoPeopleStatus) photoPeopleStatus.textContent = "";
    renderPhotoPeopleChoices();
}

async function savePhotoPeople() {
    const filename = photos[currentIndex];
    if (!filename || !adminMode) return;
    const token = getAdminToken("отметки гостей");
    if (!token) return;
    savePhotoPeopleButton.disabled = true;
    if (photoPeopleStatus) photoPeopleStatus.textContent = "Сохраняем…";
    try {
        const response = await fetch(GALLERY_BASE_PATH + "/api/photo-tags?filename=" + encodeURIComponent(filename), {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ personIds: [...editablePhotoPeople] })
        });
        if (response.status === 401) {
            sessionStorage.removeItem("wedding-gallery-admin-token");
            if (photoPeopleStatus) photoPeopleStatus.textContent = "Токен не принят. Обновите страницу и попробуйте снова.";
            return;
        }
        if (response.status === 503) {
            if (photoPeopleStatus) photoPeopleStatus.textContent = "Не настроен GALLERY_ADMIN_TOKEN.";
            return;
        }
        if (!response.ok) throw new Error("Save failed: " + response.status);
        if (editablePhotoPeople.size) photoTags[filename] = [...editablePhotoPeople];
        else delete photoTags[filename];
        if (photoPeopleStatus) photoPeopleStatus.textContent = "Сохранено";
        if (photoPeoplePopup) {
            photoPeoplePopup.classList.remove("is-saved");
            void photoPeoplePopup.offsetWidth;
            photoPeoplePopup.classList.add("is-saved");
        }
        renderGuestFilters();
        updateGalleryAfterTagSave(filename);
        await new Promise(function (resolve) { window.setTimeout(resolve, 420); });
        if (photoPeopleEditor) photoPeopleEditor.open = false;
        photoPeoplePopup?.classList.remove("is-saved");
    } catch (error) {
        console.error(error);
        if (photoPeopleStatus) photoPeopleStatus.textContent = "Не удалось сохранить отметки.";
    } finally {
        savePhotoPeopleButton.disabled = false;
    }
}

function updateGalleryAfterTagSave(filename) {
    if (!gallery) return;

    const photoIndex = photos.indexOf(filename);
    if (photoIndex < 0) return;

    const card = gallery.querySelector('[data-photo-index="' + photoIndex + '"]');
    if (card) {
        const tags = photoTags[filename] || [];
        let indicator = card.querySelector(".guest-tag-indicator");
        if (adminMode && tags.length > 0) {
            if (!indicator) {
                indicator = document.createElement("span");
                indicator.className = "guest-tag-indicator";
                indicator.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
                card.insertBefore(indicator, card.querySelector(".favorite-button"));
            }
            indicator.title = "Отмечено гостей: " + tags.length;
            indicator.setAttribute("aria-label", indicator.title);
            const thumbnail = card.querySelector(".thumbnail");
            indicator.hidden = !thumbnail?.complete || !thumbnail.naturalWidth;
        } else {
            indicator?.remove();
        }
    }

    visiblePhotoIndices = getVisiblePhotoIndices();
    if (card && !visiblePhotoIndices.includes(photoIndex)) card.remove();
    renderedCount = gallery.querySelectorAll(".photo-card").length;

    if (visiblePhotoIndices.length === 0) {
        setLoadingText(
            selectedPeople.size
                ? "Для выбранных гостей пока нет отмеченных фотографий."
                : untaggedPhotosOnly
                ? "Все фотографии галереи уже отмечены."
                : favoritesOnly
                ? "Пока нет избранных фотографий. Нажмите на сердечко у понравившегося кадра."
                : "Фотографии скоро появятся."
        );
        galleryLoading?.classList.add("empty");
        loadMoreObserver?.disconnect();
        return;
    }

    galleryLoading?.classList.remove("empty");
    setLoadingText(renderedCount >= visiblePhotoIndices.length
        ? "Загружаем последние фотографии…"
        : favoritesOnly
        ? "Дальше — ещё избранные фотографии."
        : "Дальше — ещё фотографии.");
    observeGalleryLoader();
}

function getAdminToken(action) {
    let token = sessionStorage.getItem("wedding-gallery-admin-token");
    if (!token) {
        token = window.prompt("Введите временный токен администратора для " + action + ":");
        if (!token) return null;
        sessionStorage.setItem("wedding-gallery-admin-token", token);
    }
    return token;
}

function updateFavoritesControls() {
    if (favoritesCount) {
        favoritesCount.textContent = getFavoriteCountForCurrentFilters();
    }
    if (favoritesToggle) {
        favoritesToggle.setAttribute("aria-pressed", String(favoritesOnly));
        favoritesToggle.setAttribute(
            "aria-label",
            favoritesOnly ? "Показать все фотографии" : "Показать избранные фотографии"
        );
    }
    updateGalleryPhotoCount();
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

    const token = getAdminToken("удаления");
    if (!token) return;

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
        delete photoTags[filename];
        favoritePhotos.delete(filename);
        saveFavoritePhotos();
        renderGuestFilters();
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

    galleryRenderVersion += 1;
    cancelPendingImageWait?.();
    isWaitingForMorePhotos = false;
    isFinishingGalleryVersion = null;
    if (loadMoreObserver) {
        loadMoreObserver.disconnect();
    }
    gallery.replaceChildren();
    if (galleryLoading) galleryLoading.style.display = "";
    renderedCount = 0;
    visiblePhotoIndices = getVisiblePhotoIndices();
    updateGalleryPhotoCount();

    if (visiblePhotoIndices.length === 0) {
        setLoadingText(
            selectedPeople.size
                ? "Для выбранных гостей пока нет отмеченных фотографий."
                : favoritesOnly
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

function setBigDownloadAvailability(available, filename) {
    if (!downloadBig) {
        return;
    }

    if (available) {
        downloadBig.href = getBigDownloadUrl(filename);
        downloadBig.classList.remove("is-disabled");
        downloadBig.removeAttribute("aria-disabled");
        downloadBig.removeAttribute("tabindex");
        return;
    }

    downloadBig.removeAttribute("href");
    downloadBig.classList.add("is-disabled");
    downloadBig.setAttribute("aria-disabled", "true");
    downloadBig.setAttribute("tabindex", "-1");
}

async function loadDownloadSizes(filename) {
    const requestId = ++downloadSizeRequestId;
    setBigDownloadAvailability(false, filename);

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

        const bigAvailable = Number.isFinite(sizes.big) && sizes.big >= 0;
        setBigDownloadAvailability(bigAvailable, filename);

        if (downloadBigSize) {
            downloadBigSize.textContent =
                !bigAvailable
                    ? "размер недоступен"
                    : formatFileSize(sizes.big);
        }

        if (downloadSmallSize) {
            downloadSmallSize.textContent =
                !Number.isFinite(sizes.small) || sizes.small < 0
                    ? "размер недоступен"
                    : formatFileSize(sizes.small);
        }
    } catch (error) {
        if (requestId !== downloadSizeRequestId) {
            return;
        }

        setBigDownloadAvailability(false, filename);

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
        setLoadingText("Загружаем последние фотографии…");
        observeGalleryLoader();
    } else {
        setLoadingText(
            favoritesOnly
                ? "Дальше — ещё избранные фотографии."
                : "Дальше — ещё фотографии."
        );
        observeGalleryLoader();
    }
}

function createPhotoCard(filename, index) {
    const card =
        document.createElement("article");

    const image =
        document.createElement("img");
    const favoriteButton = document.createElement("button");
    const taggedPeople = photoTags[filename];
    const guestTagIndicator = adminMode && Array.isArray(taggedPeople) && taggedPeople.length
        ? document.createElement("span")
        : null;

    card.className = "photo-card";
    card.dataset.photoIndex = index;

    favoriteButton.type = "button";
    favoriteButton.className = "favorite-button";
    favoriteButton.hidden = true;
    favoriteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.9c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.8Z" /></svg>';
    updateFavoriteButton(favoriteButton, filename);
    favoriteButton.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleFavorite(filename);
    });

    if (guestTagIndicator) {
        guestTagIndicator.className = "guest-tag-indicator";
        guestTagIndicator.hidden = true;
        guestTagIndicator.title = "Отмечено гостей: " + taggedPeople.length;
        guestTagIndicator.setAttribute("aria-label", guestTagIndicator.title);
        guestTagIndicator.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    }

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
        favoriteButton.hidden = false;
        const currentGuestTagIndicator = card.querySelector(".guest-tag-indicator");
        if (currentGuestTagIndicator) currentGuestTagIndicator.hidden = false;
        updateMasonryCard(card);
    });

    card.addEventListener(
        "click",
        function () {
            openLightbox(index);
        }
    );

    card.appendChild(image);
    if (guestTagIndicator) card.appendChild(guestTagIndicator);
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
                    if (entry.isIntersecting) {
                        if (renderedCount < visiblePhotoIndices.length) {
                            loadMorePhotos();
                        } else {
                            finishLoading();
                        }
                    }
                }
            },
            {
                root: null,
                rootMargin: "0px",
                threshold: 0
            }
        );

    observeGalleryLoader();
}

function observeGalleryLoader() {
    if (
        !loadMoreObserver ||
        !galleryLoading
    ) {
        return;
    }

    loadMoreObserver.disconnect();
    loadMoreObserver.observe(galleryLoading);
}

async function loadMorePhotos() {
    if (isLoadingBatch || isWaitingForMorePhotos) return;

    isWaitingForMorePhotos = true;
    const renderVersion = galleryRenderVersion;
    setLoadingText("Загружаем фотографии…");
    try {
        await waitForGalleryImages();
        if (renderVersion === galleryRenderVersion) {
            await renderNextBatch();
        }
    } finally {
        if (renderVersion === galleryRenderVersion) {
            isWaitingForMorePhotos = false;
        }
    }
}

function waitForGalleryImages() {
    if (!gallery) return Promise.resolve();

    const pendingImages = [...gallery.querySelectorAll(".thumbnail")].filter(function (image) {
        return !image.complete;
    });
    if (pendingImages.length === 0) return Promise.resolve();

    return new Promise(function (resolve) {
        let resolved = false;
        function finishIfReady() {
            if (resolved || !pendingImages.every(function (image) { return image.complete; })) return;
            resolved = true;
            cancelPendingImageWait = null;
            resolve();
        }

        cancelPendingImageWait = function () {
            if (resolved) return;
            resolved = true;
            cancelPendingImageWait = null;
            resolve();
        };

        pendingImages.forEach(function (image) {
            image.addEventListener("load", finishIfReady, { once: true });
            image.addEventListener("error", finishIfReady, { once: true });
            image.loading = "eager";
        });
        finishIfReady();
    });
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

async function finishLoading() {
    const renderVersion = galleryRenderVersion;
    if (isFinishingGalleryVersion === renderVersion) return;
    isFinishingGalleryVersion = renderVersion;
    loadMoreObserver?.disconnect();
    setLoadingText("Загружаем последние фотографии…");
    try {
        await waitForGalleryImages();
        if (renderVersion === galleryRenderVersion && galleryLoading) {
            galleryLoading.style.display = "none";
            galleryLoading.classList.remove("empty");
        }
    } finally {
        if (isFinishingGalleryVersion === renderVersion) {
            isFinishingGalleryVersion = null;
        }
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
    updateFavoritesControls();
    preparePhotoPeopleEditor();

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
    if (photoPeopleEditor) photoPeopleEditor.open = false;

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

    preparePhotoPeopleEditor();

    loadLightboxImage(filename);
    updateFavoritesControls();

    if (currentPhoto) {
        const position = visiblePhotoIndices.indexOf(currentIndex);
        currentPhoto.textContent = position >= 0 ? position + 1 : currentIndex + 1;
    }
    if (totalPhotos) {
        totalPhotos.textContent = visiblePhotoIndices.length;
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

if (clearGuestFilters) {
    clearGuestFilters.addEventListener("click", function () {
        selectedPeople.clear();
        untaggedPhotosOnly = false;
        renderGuestFilters();
        renderGalleryFromStart();
    });
}

if (untaggedPhotosToggle) {
    untaggedPhotosToggle.addEventListener("click", function () {
        untaggedPhotosOnly = !untaggedPhotosOnly;
        if (untaggedPhotosOnly) selectedPeople.clear();
        renderGuestFilters();
        renderGalleryFromStart();
    });
}

if (savePhotoPeopleButton) savePhotoPeopleButton.addEventListener("click", savePhotoPeople);
if (photoPeopleBackdrop) {
    photoPeopleBackdrop.addEventListener("click", function () {
        if (photoPeopleEditor) photoPeopleEditor.open = false;
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
            if (photoPeopleEditor?.open) {
                photoPeopleEditor.open = false;
                return;
            }
            closeLightbox();
            return;
        }

        if (photoPeopleEditor?.open) {
            return;
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
            if (photoPeopleEditor?.open) {
                touchStartX = null;
                touchStartY = null;
                return;
            }

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
