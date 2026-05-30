const hero = document.getElementById("hero");
const floatingWeeks = document.getElementById("floatingWeeks");
const weekFloats = document.querySelectorAll(".week-float");

const sceneDim = document.getElementById("sceneDim");

const modalOverlay = document.getElementById("modalOverlay");
const modalWindow = document.querySelector(".modal-window");
const modalClose = document.getElementById("modalClose");
const modalScroll = document.querySelector(".modal-scroll");
const modalContents = document.querySelectorAll(".modal-content");

const customScrollbar = document.querySelector(".modal-custom-scrollbar");
const customThumb = document.querySelector(".modal-custom-thumb");

let revealObserver = null;
let modalTimers = [];
let activeTrigger = null;

let isDraggingScrollbar = false;
let dragStartY = 0;
let dragStartScrollTop = 0;

let isAnimating = false;
let floatingPaused = false;

let currentVoidShape = null;
let currentMorphShape = null;

const floatStates = [];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}


function setupFloatingWeeks() {
  weekFloats.forEach((item, index) => {
    const rect = item.getBoundingClientRect();

    const w = Math.max(rect.width, 90);
    const h = Math.max(rect.height, 44);

    let x = randomBetween(w / 2 + 24, window.innerWidth - w / 2 - 24);
    let y = randomBetween(h / 2 + 24, window.innerHeight - h / 2 - 24);

    let attempts = 0;

    while (attempts < 100) {
      const fakeState = { x, y, w, h };

      const hasCollision =
        collidesWithTitle(fakeState) ||
        floatStates.some((state) => boxesCollide(fakeState, state, 34));

      if (!hasCollision) break;

      x = randomBetween(w / 2 + 24, window.innerWidth - w / 2 - 24);
      y = randomBetween(h / 2 + 24, window.innerHeight - h / 2 - 24);

      attempts++;
    }

    const vx = randomBetween(-0.45, 0.45);
    const vy = randomBetween(-0.45, 0.45);

    floatStates[index] = {
      el: item,
      x,
      y,
      vx: Math.abs(vx) < 0.12 ? 0.26 : vx,
      vy: Math.abs(vy) < 0.12 ? -0.26 : vy,
      w,
      h,
      rot: randomBetween(-10, 10)
    };

    item.style.setProperty("--rot", `${floatStates[index].rot}deg`);
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;

    item.addEventListener("click", () => {
      if (isAnimating) return;
      if (modalOverlay.classList.contains("active")) return;

      startShapeOpen(item.dataset.modal, item);
    });
  });

  requestAnimationFrame(animateFloatingWeeks);
}

function boxesCollide(a, b, padding = 0) {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);

  const minX = (a.w + b.w) / 2 + padding;
  const minY = (a.h + b.h) / 2 + padding;

  return dx < minX && dy < minY;
}

function getTitleObstacle() {
  const title = document.querySelector(".site-title");
  if (!title) return null;

  const rect = title.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    w: rect.width,
    h: rect.height
  };
}

function collidesWithTitle(state) {
  const title = getTitleObstacle();
  if (!title) return false;

  return boxesCollide(state, title, 48);
}

function resolveTitleCollision(state) {
  const title = getTitleObstacle();
  if (!title) return;

  const dx = state.x - title.x;
  const dy = state.y - title.y;

  const minX = (state.w + title.w) / 2 + 52;
  const minY = (state.h + title.h) / 2 + 52;

  const overlapX = minX - Math.abs(dx);
  const overlapY = minY - Math.abs(dy);

  if (overlapX > 0 && overlapY > 0) {
    if (overlapX < overlapY) {
      const dir = dx >= 0 ? 1 : -1;

      state.x += overlapX * dir;
      state.vx = Math.abs(state.vx) * dir;
    } else {
      const dir = dy >= 0 ? 1 : -1;

      state.y += overlapY * dir;
      state.vy = Math.abs(state.vy) * dir;
    }
  }
}

function keepFloatInBounds(state) {
  const minX = state.w / 2 + 12;
  const maxX = window.innerWidth - state.w / 2 - 12;

  const minY = state.h / 2 + 12;
  const maxY = window.innerHeight - state.h / 2 - 12;

  if (state.x < minX) {
    state.x = minX;
    state.vx = Math.abs(state.vx);
  }

  if (state.x > maxX) {
    state.x = maxX;
    state.vx = -Math.abs(state.vx);
  }

  if (state.y < minY) {
    state.y = minY;
    state.vy = Math.abs(state.vy);
  }

  if (state.y > maxY) {
    state.y = maxY;
    state.vy = -Math.abs(state.vy);
  }
}

function resolveFloatCollisions() {
  for (let i = 0; i < floatStates.length; i++) {
    for (let j = i + 1; j < floatStates.length; j++) {
      const a = floatStates[i];
      const b = floatStates[j];

      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;

      const minX = (a.w + b.w) / 2 + 24;
      const minY = (a.h + b.h) / 2 + 24;

      const overlapX = minX - Math.abs(dx);
      const overlapY = minY - Math.abs(dy);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const push = overlapX / 2;
          const dir = dx >= 0 ? 1 : -1;

          a.x -= push * dir;
          b.x += push * dir;

          const tempVx = a.vx;
          a.vx = b.vx * 0.94;
          b.vx = tempVx * 0.94;
        } else {
          const push = overlapY / 2;
          const dir = dy >= 0 ? 1 : -1;

          a.y -= push * dir;
          b.y += push * dir;

          const tempVy = a.vy;
          a.vy = b.vy * 0.94;
          b.vy = tempVy * 0.94;
        }
      }
    }
  }
}

function updateFloatSizes() {
  floatStates.forEach((state) => {
    if (!state || !state.el) return;

    const rect = state.el.getBoundingClientRect();

    state.w = rect.width;
    state.h = rect.height;

    keepFloatInBounds(state);
    resolveTitleCollision(state);

    state.el.style.left = `${state.x}px`;
    state.el.style.top = `${state.y}px`;
  });
}

function animateFloatingWeeks() {
  if (!floatingPaused) {
    floatStates.forEach((state) => {
      if (!state) return;

      state.x += state.vx;
      state.y += state.vy;

      keepFloatInBounds(state);
      resolveTitleCollision(state);
    });

    resolveFloatCollisions();

    floatStates.forEach((state) => {
      if (!state) return;

      keepFloatInBounds(state);
      resolveTitleCollision(state);

      state.el.style.left = `${state.x}px`;
      state.el.style.top = `${state.y}px`;
    });
  }

  requestAnimationFrame(animateFloatingWeeks);
}


function getRandomTriangleType() {
  const variants = [
    {
      p1: "50% 0%",
      p2: "100% 100%",
      p3: "0% 100%"
    },
    {
      p1: "0% 12%",
      p2: "100% 42%",
      p3: "8% 100%"
    },
    {
      p1: "0% 0%",
      p2: "100% 56%",
      p3: "0% 100%"
    },
    {
      p1: "0% 0%",
      p2: "100% 100%",
      p3: "0% 100%"
    },
    {
      p1: "100% 0%",
      p2: "88% 100%",
      p3: "0% 48%"
    },
    {
      p1: "42% 0%",
      p2: "96% 100%",
      p3: "8% 84%"
    }
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}

function triangleToAnimatablePolygon(triangle) {
  return `${triangle.p1}, ${triangle.p2}, ${triangle.p3}, ${triangle.p3}`;
}

function getShapeSizeForText(triggerElement) {
  const textRect = triggerElement.getBoundingClientRect();
  const screenArea = window.innerWidth * window.innerHeight;

  const maxArea = screenArea * 0.2;

  const minW = textRect.width * randomBetween(1.45, 2.15);
  const minH = textRect.height * randomBetween(3.0, 4.6);

  const aspect = randomBetween(0.75, 1.85);

  let width = Math.max(minW, Math.sqrt(maxArea * aspect) * randomBetween(0.45, 0.82));
  let height = Math.max(minH, width / aspect);

  if (width * height > maxArea) {
    const scale = Math.sqrt(maxArea / (width * height));

    width *= scale;
    height *= scale;
  }

  width = Math.max(width, minW);
  height = Math.max(height, minH);

  const maxW = window.innerWidth * 0.72;
  const maxH = window.innerHeight * 0.72;

  width = Math.min(width, maxW);
  height = Math.min(height, maxH);

  return {
    width,
    height
  };
}

function createShapesAtTrigger(triggerElement) {
  removeCurrentShapes();

  const rect = triggerElement.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const triangle = getRandomTriangleType();
  const polygon = triangleToAnimatablePolygon(triangle);
  const size = getShapeSizeForText(triggerElement);

  const voidShape = document.createElement("div");
  const morphShape = document.createElement("div");

  voidShape.className = "void-shape";
  morphShape.className = "morph-shape";

  morphShape.dataset.label = triggerElement.textContent.trim();

  const triggerStyle = window.getComputedStyle(triggerElement);

  const labelSize = triggerStyle.fontSize;
  const labelRotate = triggerStyle.getPropertyValue("--rot").trim() || "0deg";

  morphShape.style.setProperty("--label-size", labelSize);
  morphShape.style.setProperty("--label-rotate", labelRotate);

  [voidShape, morphShape].forEach((shape) => {
    shape.style.setProperty("--shape-left", `${centerX}px`);
    shape.style.setProperty("--shape-top", `${centerY}px`);
    shape.style.setProperty("--shape-w", `${size.width}px`);
    shape.style.setProperty("--shape-h", `${size.height}px`);
    shape.style.setProperty("--shape-poly", polygon);
  });

  document.body.appendChild(voidShape);
  document.body.appendChild(morphShape);

  currentVoidShape = voidShape;
  currentMorphShape = morphShape;
}

function removeCurrentShapes() {
  if (currentVoidShape) {
    currentVoidShape.remove();
    currentVoidShape = null;
  }

  if (currentMorphShape) {
    currentMorphShape.remove();
    currentMorphShape = null;
  }
}



function startShapeOpen(modalId, triggerElement) {
  isAnimating = true;
  floatingPaused = true;
  activeTrigger = triggerElement;

  modalTimers.forEach((timer) => clearTimeout(timer));
  modalTimers = [];

  resetModal();

  modalOverlay.classList.remove("active");
  modalOverlay.classList.remove("is-ui-hiding");
  modalOverlay.classList.remove("images-ready");
  modalOverlay.classList.remove("text-ready");

  sceneDim.classList.remove("active");

  createShapesAtTrigger(triggerElement);

  triggerElement.style.transition = "none";

  // triggerElement.classList.add("is-hidden");

  currentVoidShape.offsetHeight;
  currentMorphShape.offsetHeight;

  requestAnimationFrame(() => {
    currentVoidShape.classList.add("active");
    currentMorphShape.classList.add("active");

    requestAnimationFrame(() => {
      if (!currentMorphShape) return;

      currentMorphShape.classList.add("lifted");
    });
  });

  modalTimers.push(
    setTimeout(() => {
      if (!currentMorphShape) return;

      sceneDim.classList.add("active");
      currentMorphShape.classList.add("to-modal");
    }, 950)
  );

  modalTimers.push(
    setTimeout(() => {
      openModalContent(modalId);
      isAnimating = false;
    }, 2150)
  );
}

function openModalContent(modalId) {
  const activeContent = document.getElementById(modalId);

  if (activeContent) {
    activeContent.classList.add("active");
  }

  modalScroll.scrollTop = 0;

  setupRevealObserver(activeContent);

  modalOverlay.classList.add("active");
  document.body.style.overflow = "hidden";

  updateCustomScrollbar();

  modalTimers.push(
    setTimeout(() => {
      modalOverlay.classList.add("images-ready");
      checkVisibleElements();
      updateCustomScrollbar();
    }, 450)
  );

  modalTimers.push(
    setTimeout(() => {
      modalOverlay.classList.add("text-ready");
      checkVisibleElements();
      updateCustomScrollbar();
    }, 850)
  );
}


function closeModal() {
  if (isAnimating) return;

  isAnimating = true;

  modalTimers.forEach((timer) => clearTimeout(timer));
  modalTimers = [];

  modalOverlay.classList.remove("images-ready");
  modalOverlay.classList.remove("text-ready");
  modalOverlay.classList.add("is-ui-hiding");

  setTimeout(() => {
    modalOverlay.classList.remove("active");


    if (currentMorphShape) {
      currentMorphShape.classList.add("label-hidden");
      currentMorphShape.classList.remove("to-modal");
    }

    setTimeout(() => {

      sceneDim.classList.remove("active");

      setTimeout(() => {

        if (currentMorphShape) {
          currentMorphShape.classList.remove("lifted");
        }

        setTimeout(() => {

          if (currentVoidShape) {
            currentVoidShape.classList.remove("active");
          }

          if (currentMorphShape) {
            currentMorphShape.classList.remove("active");
          }

          setTimeout(() => {
            resetModal();

            modalOverlay.classList.remove("is-ui-hiding");

            removeCurrentShapes();

            if (activeTrigger) {
              const trigger = activeTrigger;

              // trigger.classList.remove("is-hidden");
              trigger.style.transition = "none";

              trigger.offsetHeight;

              requestAnimationFrame(() => {
                trigger.style.transition = "";
                activeTrigger = null;
              });
            }

            document.body.style.overflow = "hidden";

            updateCustomScrollbar();

            floatingPaused = false;
            isAnimating = false;
          }, 360);
        }, 920);
      }, 180);
    }, 1050);
  }, 240);
}


function getMediaType(src) {
  const cleanSrc = (src || "").split("?")[0].split("#")[0].toLowerCase();

  if (cleanSrc.endsWith(".mp4")) {
    return "video";
  }

  if (
    cleanSrc.endsWith(".jpg") ||
    cleanSrc.endsWith(".jpeg") ||
    cleanSrc.endsWith(".png") ||
    cleanSrc.endsWith(".webp")
  ) {
    return "image";
  }

  return "image";
}

function createMediaElement(src, type, alt = "", isThumb = false) {
  if (type === "video") {
    const video = document.createElement("video");

    video.src = src;
    video.muted = isThumb;
    video.loop = isThumb;
    video.playsInline = true;
    video.preload = "metadata";

    if (!isThumb) {
      video.controls = true;
    }

    return video;
  }

  const img = document.createElement("img");
  img.src = src;
  img.alt = alt || "";

  return img;
}

function getMediaItemsFromBlock(imagesBlock) {
  const directItems = Array.from(
    imagesBlock.querySelectorAll(":scope > img, :scope > video, :scope > a")
  );

  return directItems
    .map((el) => {
      let src = "";
      let alt = "";

      if (el.tagName.toLowerCase() === "img") {
        src = el.getAttribute("src") || "";
        alt = el.getAttribute("alt") || "";
      }

      if (el.tagName.toLowerCase() === "video") {
        src = el.getAttribute("src") || "";

        if (!src) {
          const source = el.querySelector("source");
          src = source ? source.getAttribute("src") || "" : "";
        }
      }

      if (el.tagName.toLowerCase() === "a") {
        src = el.getAttribute("href") || "";
        alt = el.textContent.trim();
      }

      if (!src) return null;

      return {
        src,
        alt,
        type: getMediaType(src),
        original: el
      };
    })
    .filter(Boolean);
}

function initModalCarousels() {
  document.querySelectorAll(".modal-images").forEach((imagesBlock) => {
    if (imagesBlock.dataset.carouselReady === "1") return;

    const mediaItems = getMediaItemsFromBlock(imagesBlock);

    if (!mediaItems.length) return;

    if (mediaItems.length === 1) {
      const item = mediaItems[0];

      imagesBlock.innerHTML = "";

      const singleMedia = createMediaElement(item.src, item.type, item.alt, false);
      singleMedia.classList.add("modal-image-reveal");

      imagesBlock.appendChild(singleMedia);
      imagesBlock.dataset.carouselReady = "1";

      return;
    }

    const carousel = document.createElement("div");
    carousel.className = "modal-carousel modal-image-reveal";

    const main = document.createElement("div");
    main.className = "modal-carousel-main";

    let activeMainMedia = createMediaElement(
      mediaItems[0].src,
      mediaItems[0].type,
      mediaItems[0].alt,
      false
    );

    main.appendChild(activeMainMedia);

    const thumbs = document.createElement("div");
    thumbs.className = "modal-carousel-thumbs";

    mediaItems.forEach((item, index) => {
      const thumbButton = document.createElement("button");
      thumbButton.type = "button";
      thumbButton.className = "modal-carousel-thumb";

      if (index === 0) {
        thumbButton.classList.add("active");
      }

      const thumbMedia = createMediaElement(item.src, item.type, item.alt, true);
      thumbButton.appendChild(thumbMedia);

      if (item.type === "video") {
        thumbButton.classList.add("is-video");
      }

      thumbButton.addEventListener("click", () => {
        const newMainMedia = createMediaElement(
          item.src,
          item.type,
          item.alt,
          false
        );

        main.innerHTML = "";
        main.appendChild(newMainMedia);
        activeMainMedia = newMainMedia;

        thumbs.querySelectorAll(".modal-carousel-thumb").forEach((btn) => {
          btn.classList.remove("active");
        });

        thumbButton.classList.add("active");

        updateCustomScrollbar();
      });

      thumbs.appendChild(thumbButton);
    });

    carousel.appendChild(main);
    carousel.appendChild(thumbs);

    imagesBlock.innerHTML = "";
    imagesBlock.appendChild(carousel);

    imagesBlock.dataset.carouselReady = "1";
  });
}

function resetModal() {
  modalContents.forEach((content) => {
    content.classList.remove("active");
  });

  document.querySelectorAll(".is-visible").forEach((el) => {
    el.classList.remove("is-visible");
  });

  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }
}

function setupRevealObserver(activeContent) {
  if (!activeContent) return;

  const revealElements = activeContent.querySelectorAll(
    ".modal-image-reveal, .modal-text h1, .modal-text h3, .modal-text p"
  );

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;

        if (el.classList.contains("modal-image-reveal")) {
          if (modalOverlay.classList.contains("images-ready")) {
            el.classList.add("is-visible");
            revealObserver.unobserve(el);
          }

          return;
        }

        if (
          el.matches(".modal-text h1") ||
          el.matches(".modal-text h3") ||
          el.matches(".modal-text p")
        ) {
          if (modalOverlay.classList.contains("text-ready")) {
            el.classList.add("is-visible");
            revealObserver.unobserve(el);
          }
        }
      });
    },
    {
      root: modalScroll,
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealElements.forEach((el) => {
    revealObserver.observe(el);
  });
}

function checkVisibleElements() {
  if (!modalScroll) return;

  const activeContent = document.querySelector(".modal-content.active");

  if (!activeContent) return;

  const elements = activeContent.querySelectorAll(
    ".modal-image-reveal, .modal-text h1, .modal-text h3, .modal-text p"
  );

  const scrollRect = modalScroll.getBoundingClientRect();

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();

    const isVisible =
      rect.top < scrollRect.bottom * 0.92 &&
      rect.bottom > scrollRect.top;

    if (!isVisible) return;

    if (
      el.classList.contains("modal-image-reveal") &&
      modalOverlay.classList.contains("images-ready")
    ) {
      el.classList.add("is-visible");
    }

    if (
      (
        el.matches(".modal-text h1") ||
        el.matches(".modal-text h3") ||
        el.matches(".modal-text p")
      ) &&
      modalOverlay.classList.contains("text-ready")
    ) {
      el.classList.add("is-visible");
    }
  });
}

function updateCustomScrollbar() {
  if (!modalScroll || !customScrollbar || !customThumb) return;

  const scrollHeight = modalScroll.scrollHeight;
  const clientHeight = modalScroll.clientHeight;
  const scrollTop = modalScroll.scrollTop;

  if (scrollHeight <= clientHeight) {
    customScrollbar.style.display = "none";
    return;
  }

  customScrollbar.style.display = "block";

  const trackHeight = customScrollbar.clientHeight;
  const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 44);

  const maxScrollTop = scrollHeight - clientHeight;
  const maxThumbTop = trackHeight - thumbHeight;

  const thumbTop = maxScrollTop > 0
    ? (scrollTop / maxScrollTop) * maxThumbTop
    : 0;

  customThumb.style.height = `${thumbHeight}px`;
  customThumb.style.transform = `translateY(${thumbTop}px)`;
}

modalScroll.addEventListener("scroll", () => {
  updateCustomScrollbar();
  checkVisibleElements();
});

window.addEventListener("resize", () => {
  updateCustomScrollbar();
  updateFloatSizes();
});

customThumb.addEventListener("mousedown", (e) => {
  isDraggingScrollbar = true;
  dragStartY = e.clientY;
  dragStartScrollTop = modalScroll.scrollTop;

  document.body.style.userSelect = "none";
});

window.addEventListener("mousemove", (e) => {
  if (!isDraggingScrollbar) return;

  const scrollHeight = modalScroll.scrollHeight;
  const clientHeight = modalScroll.clientHeight;
  const trackHeight = customScrollbar.clientHeight;
  const thumbHeight = customThumb.offsetHeight;

  const maxScrollTop = scrollHeight - clientHeight;
  const maxThumbTop = trackHeight - thumbHeight;

  if (maxThumbTop <= 0) return;

  const deltaY = e.clientY - dragStartY;
  const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;

  modalScroll.scrollTop = dragStartScrollTop + scrollDelta;
});

window.addEventListener("mouseup", () => {
  isDraggingScrollbar = false;
  document.body.style.userSelect = "";
});


modalClose.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
    closeModal();
  }
});


initModalCarousels();
setupFloatingWeeks();