const photos = Array.from(
    { length: 10 },
    (_, i) =>
        `I+A_s_${String(i + 1).padStart(5, "0")}.jpg`
);

const photoBaseUrl =
    "https://photos.aligor.us";

const galleryBasePath =
    "/wedding-gallery";


const gallery =
    document.getElementById("gallery");

const galleryLoading =
    document.getElementById("gallery-loading");

const lightbox =
    document.getElementById("lightbox");

const lightboxImage =
    document.getElementById("lightbox-image");

const lightboxLoader =
    document.getElementById("lightbox-loader");

const downloadBig =
    document.getElementById("download-big");

const downloadSmall =
    document.getElementById("download-small");

const currentPhoto =
    document.getElementById("current-photo");

const totalPhotos =
    document.getElementById("total-photos");

const closeButton =
    document.querySelector(".lightbox-close");

const previousButton =
    document.querySelector(".lightbox-prev");

const nextButton =
    document.querySelector(".lightbox-next");


let currentIndex = 0;

let touchStartX = 0;
let touchStartY = 0;


/* =========================
   INITIALIZATION
   ========================= */

totalPhotos.textContent =
    photos.length;

createGallery();


/* =========================
   CREATE GALLERY
   ========================= */

function createGallery() {

    photos.forEach(
        (filename, index) => {

            const card =
                document.createElement("div");

            card.className =
                "photo-card";

            card.style.animationDelay =
                `${Math.min(
                    index * 0.035,
                    0.7
                )}s`;


            const img =
                document.createElement("img");

            img.alt =
                `Wedding photo ${index + 1}`;

            img.loading =
                index < 8
                    ? "eager"
                    : "lazy";

            img.decoding =
                "async";


            const url =
                `${photoBaseUrl}/small/${encodeURIComponent(
                    filename
                )}`;


            img.src = url;


            img.addEventListener(
                "click",
                () => {
                    openPhoto(index);
                }
            );


            card.appendChild(img);

            gallery.appendChild(card);
        }
    );


    galleryLoading.classList.add(
        "hidden"
    );
}


/* =========================
   OPEN PHOTO
   ========================= */

function openPhoto(index) {

    if (
        index < 0 ||
        index >= photos.length
    ) {
        return;
    }


    currentIndex = index;


    const smallFilename =
        photos[index];

    const bigFilename =
        smallFilename.replace(
            "_s_",
            "_b_"
        );


    const bigUrl =
        `${photoBaseUrl}/big/${encodeURIComponent(
            bigFilename
        )}`;


    currentPhoto.textContent =
        index + 1;

    totalPhotos.textContent =
        photos.length;


    lightboxImage.classList.remove(
        "loaded"
    );

    lightboxLoader.classList.remove(
        "hidden"
    );


    lightboxImage.src =
        bigUrl;

    lightboxImage.alt =
        `Wedding photo ${index + 1}`;


    lightboxImage.onload =
        () => {

            lightboxLoader.classList.add(
                "hidden"
            );

            lightboxImage.classList.add(
                "loaded"
            );
        };


    lightboxImage.onerror =
        () => {

            lightboxLoader.classList.add(
                "hidden"
            );
        };


    /*
     * Download through our Worker.
     */

    downloadBig.href =
        `${galleryBasePath}/download/big/${encodeURIComponent(
            bigFilename
        )}`;

    downloadBig.download =
        bigFilename;


    downloadSmall.href =
        `${galleryBasePath}/download/small/${encodeURIComponent(
            smallFilename
        )}`;

    downloadSmall.download =
        smallFilename;


    lightbox.classList.add(
        "active"
    );

    lightbox.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    preloadPhoto(
        getPreviousIndex()
    );

    preloadPhoto(
        getNextIndex()
    );
}


/* =========================
   CLOSE LIGHTBOX
   ========================= */

function closeLightbox() {

    lightbox.classList.remove(
        "active"
    );

    lightbox.setAttribute(
        "aria-hidden",
        "true"
    );

    lightboxImage.src = "";

    document.body.style.overflow =
        "";
}


/* =========================
   NAVIGATION
   ========================= */

function getPreviousIndex() {

    return (
        currentIndex -
        1 +
        photos.length
    ) % photos.length;
}


function getNextIndex() {

    return (
        currentIndex + 1
    ) % photos.length;
}


function showPrevious() {

    openPhoto(
        getPreviousIndex()
    );
}


function showNext() {

    openPhoto(
        getNextIndex()
    );
}


/* =========================
   PRELOAD
   ========================= */

function preloadPhoto(index) {

    const filename =
        photos[index];

    if (!filename) {
        return;
    }


    const bigFilename =
        filename.replace(
            "_s_",
            "_b_"
        );


    const image =
        new Image();


    image.src =
        `${photoBaseUrl}/big/${encodeURIComponent(
            bigFilename
        )}`;
}


/* =========================
   BUTTONS
   ========================= */

closeButton.addEventListener(
    "click",
    closeLightbox
);

previousButton.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();

        showPrevious();
    }
);

nextButton.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();

        showNext();
    }
);


/* =========================
   BACKGROUND CLICK
   ========================= */

lightbox.addEventListener(
    "click",
    (event) => {

        if (
            event.target === lightbox
        ) {
            closeLightbox();
        }
    }
);


/* =========================
   KEYBOARD
   ========================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            !lightbox.classList.contains(
                "active"
            )
        ) {
            return;
        }


        if (
            event.key === "Escape"
        ) {

            closeLightbox();

        } else if (
            event.key === "ArrowLeft"
        ) {

            showPrevious();

        } else if (
            event.key === "ArrowRight"
        ) {

            showNext();
        }
    }
);


/* =========================
   MOBILE SWIPE
   ========================= */

lightbox.addEventListener(
    "touchstart",
    (event) => {

        const touch =
            event.changedTouches[0];

        touchStartX =
            touch.clientX;

        touchStartY =
            touch.clientY;
    },
    {
        passive: true
    }
);


lightbox.addEventListener(
    "touchend",
    (event) => {

        const touch =
            event.changedTouches[0];

        const deltaX =
            touch.clientX -
            touchStartX;

        const deltaY =
            touch.clientY -
            touchStartY;


        if (
            Math.abs(deltaX) < 50
        ) {
            return;
        }


        if (
            Math.abs(deltaX) <
            Math.abs(deltaY)
        ) {
            return;
        }


        if (deltaX < 0) {
            showNext();
        } else {
            showPrevious();
        }
    },
    {
        passive: true
    }
);


/* =========================
   IMAGE DRAG
   ========================= */

lightboxImage.addEventListener(
    "dragstart",
    (event) => {
        event.preventDefault();
    }
);