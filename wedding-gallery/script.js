const photos = Array.from(
    { length: 10 },
    (_, i) =>
        `I+A_s_${String(i + 1).padStart(5, "0")}.jpg`
);


const PHOTO_BASE_URL =
    "https://photos.aligor.us";

const GALLERY_BASE_PATH =
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


/* =========================================================
   INITIALIZATION
   ========================================================= */

totalPhotos.textContent =
    photos.length;

createGallery();


/* =========================================================
   CREATE GALLERY
   ========================================================= */

function createGallery() {

    photos.forEach(
        (filename, index) => {

            const card =
                document.createElement("div");

            card.className =
                "photo-card";

            card.style.animationDelay =
                `${Math.min(
                    index * 0.04,
                    0.7
                )}s`;


            const image =
                document.createElement("img");

            image.className =
                "thumbnail";

            image.alt =
                `Wedding photo ${index + 1}`;

            image.loading =
                index < 6
                    ? "eager"
                    : "lazy";

            image.decoding =
                "async";


            image.src =
                `${PHOTO_BASE_URL}/small/${encodeURIComponent(
                    filename
                )}`;


            image.addEventListener(
                "click",
                () => {
                    openPhoto(index);
                }
            );


            card.appendChild(image);

            gallery.appendChild(card);
        }
    );


    galleryLoading.classList.add(
        "hidden"
    );
}


/* =========================================================
   OPEN PHOTO
   ========================================================= */

function openPhoto(index) {

    currentIndex = index;


    const smallFilename =
        photos[index];

    const bigFilename =
        smallFilename.replace(
            "_s_",
            "_b_"
        );


    const bigUrl =
        `${PHOTO_BASE_URL}/big/${encodeURIComponent(
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
     * Download full-size image
     */

    downloadBig.href =
        `${GALLERY_BASE_PATH}/download/big/${encodeURIComponent(
            bigFilename
        )}`;

    downloadBig.setAttribute(
        "download",
        bigFilename
    );


    /*
     * Download small image
     */

    downloadSmall.href =
        `${GALLERY_BASE_PATH}/download/small/${encodeURIComponent(
            smallFilename
        )}`;

    downloadSmall.setAttribute(
        "download",
        smallFilename
    );


    lightbox.classList.add(
        "active"
    );

    lightbox.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE LIGHTBOX
   ========================================================= */

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


/* =========================================================
   NAVIGATION
   ========================================================= */

function previousPhoto() {

    currentIndex =
        (
            currentIndex -
            1 +
            photos.length
        ) % photos.length;

    openPhoto(currentIndex);
}


function nextPhoto() {

    currentIndex =
        (
            currentIndex +
            1
        ) % photos.length;

    openPhoto(currentIndex);
}


/* =========================================================
   BUTTONS
   ========================================================= */

closeButton.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();

        closeLightbox();
    }
);


previousButton.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();

        previousPhoto();
    }
);


nextButton.addEventListener(
    "click",
    (event) => {

        event.stopPropagation();

        nextPhoto();
    }
);


/* =========================================================
   CLICK OUTSIDE PHOTO
   ========================================================= */

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


/* =========================================================
   KEYBOARD
   ========================================================= */

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

            return;
        }


        if (
            event.key === "ArrowLeft"
        ) {
            previousPhoto();

            return;
        }


        if (
            event.key === "ArrowRight"
        ) {
            nextPhoto();
        }
    }
);


/* =========================================================
   MOBILE SWIPE
   ========================================================= */

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

        const touchEndX =
            touch.clientX;

        const touchEndY =
            touch.clientY;


        const differenceX =
            touchEndX -
            touchStartX;

        const differenceY =
            touchEndY -
            touchStartY;


        /*
         * Ignore mostly vertical gestures.
         */

        if (
            Math.abs(differenceX) <
            Math.abs(differenceY)
        ) {
            return;
        }


        /*
         * Ignore very short swipes.
         */

        if (
            Math.abs(differenceX) < 50
        ) {
            return;
        }


        if (differenceX < 0) {
            nextPhoto();
        } else {
            previousPhoto();
        }
    },
    {
        passive: true
    }
);