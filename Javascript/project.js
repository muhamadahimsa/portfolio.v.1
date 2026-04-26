import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm';
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';
import { Draggable } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/Draggable/+esm';

// Registrasi semua plugin agar siap tempur
gsap.registerPlugin(ScrollTrigger, Draggable);

// === LENIS MULTI PANEL SCROLL ===

// ambil elemen panel
const leftPanel = document.querySelector(".left-panel");
const rightPanel = document.querySelector(".right-panel");

const modal = document.getElementById("projectModal");
const modalCloseBtn = modal.querySelector(".modal-close");
const modalVideoContainer = modal.querySelector(".modal-video-container");
const modalGalleryContainer = modal.querySelector(".modal-gallery-container");
const modalGalleryInner = modal.querySelector(".modal-gallery-inner");
const galleryNavBtns = modal.querySelectorAll(".gallery-nav");

if (!leftPanel || !rightPanel) {
  console.warn("Panels not found — check DOM timing.");
}

// ambil konten dalam panel
const leftContent = leftPanel.querySelector(".left-content");
const rightContent = rightPanel.querySelector(".content");

// bikin 2 instance Lenis, masing-masing untuk panel kiri dan kanan
// 1. Konfigurasi Scroll Cinematic
const scrollConfig = {
  duration: 2.0, // Durasi scroll lebih lama (cinematic)
  lerp: 0.05, // Nilai rendah = efek 'berat' dan smooth (inertia)
  wheelMultiplier: 0.5, // Menghaluskan tarikan wheel
  touchMultiplier: 2, // Agar di layar sentuh tetep responsif
  smoothWheel: true,
  smoothTouch: true,
  syncTouch: true,        // Menghubungkan scroll Lenis dengan jari
  syncTouchLerp: 0.08,    // Memberikan efek "smooth" setelah jari lepas dari layar
  touchInertiaMultiplier: 40,
};

// 2. Inisialisasi Lenis Left Panel
const lenisLeft = new Lenis({
  wrapper: leftPanel,
  content: leftContent,
  wheelEventsTarget: leftPanel,
  syncTouch: true,
  ...scrollConfig,
});

// 3. Inisialisasi Lenis Right Panel
const lenisRight = new Lenis({
  wrapper: rightPanel,
  content: rightContent,
  wheelEventsTarget: rightPanel,
  infinite: true, // Tetap aktifkan infinite scroll
  syncTouch: true,
  ...scrollConfig,
});

// track scroll values untuk keyboard handling
let leftScroll = 0;
let rightScroll = 0;

lenisLeft.on("scroll", ({ scroll }) => {
  leftScroll = scroll;
});

// === INFINITE LOOP UNTUK RIGHT PANEL (CLEAN VERSION) ===
let originalHeight = 0;

function recalcHeights(initial = false) {
  originalHeight = rightContent.scrollHeight;
  if (initial) rightScroll = lenisRight.scroll;
}

// Variable untuk menyimpan semua instance parallax agar bisa di-kill saat resize
let parallaxTriggers = [];

function createParallax() {
  // Bersihkan trigger lama
  parallaxTriggers.forEach((t) => t.kill());
  parallaxTriggers = [];

  // Ambil semua section yang punya class parallax
  const parallaxSections = document.querySelectorAll(".case-section.parallax");

  parallaxSections.forEach((section) => {
    const image = section.querySelector(".project-bg img");
    if (!image) return;

    // Buat animasi untuk setiap gambar
    const trigger = gsap.fromTo(
      image,
      {
        yPercent: -10, // Mulai dari posisi agak ke atas
      },
      {
        yPercent: 10, // Berakhir agak ke bawah
        ease: "none",
        scrollTrigger: {
          trigger: section, // Trigger-nya adalah section-nya
          scroller: ".right-panel", // WAJIB: Karena lu pakai Lenis di wrapper
          start: "top bottom", // Mulai saat top section masuk bottom viewport
          end: "bottom top", // Selesai saat bottom section keluar top viewport
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );

    parallaxTriggers.push(trigger);
  });
}

// Update pada event listener
window.addEventListener("load", () => {
  lenisRight.resize();
  recalcHeights(true);
  resetIdle();

  // Pastikan ScrollTrigger tahu posisi awal setelah Lenis siap
  ScrollTrigger.refresh();
  createParallax();
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  createParallax();
  resizeTimeout = setTimeout(() => {
    // Paksa Lenis hitung ulang koordinat infinite-nya setelah CSS Media Query berubah
    lenisRight.resize();
    lenisLeft.resize();

    // Hitung ulang tinggi konten asli untuk logika idle
    recalcHeights(false);

    // Opsional: Matikan auto-scroll di mobile kalau dirasa mengganggu
    if (window.innerWidth < 768) {
      // isIdle = false; // Jika mau dimatikan total di mobile
    }
  }, 250); // Jeda 250ms supaya browser kelar render perubahan ukuran gambar/font
});

// === IDLE LOGIC (DIPERBAIKI) ===
let idleTimer;
let isIdle = false;
const idleDelay = 2000;
const idleSpeed = 1.0; // Gue naikin ke 1.0 biar kelihatan geraknya bro

function resetIdle(e) {
  // Jika ini adalah pergerakan mouse, cek apakah pergerakannya signifikan
  if (e && e.type === "mousemove") {
    if (Math.abs(e.movementX) < 0.1 && Math.abs(e.movementY) < 0.1) return;
  }

  isIdle = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    isIdle = true;
  }, idleDelay);
}

// Pasang listener secara selektif
[
  "wheel",
  "touchstart",
  "mousedown",
  "keydown",
  "mousemove", // mousemove tetep ada tapi sudah kita filter di atas
].forEach((evt) => {
  window.addEventListener(evt, resetIdle, { passive: true });
});

// === KEYBOARD SUPPORT ===
function handleKeyScroll(e) {
  const activePanel =
    document.activeElement.closest(".left-panel, .right-panel") || rightPanel;

  const STEP = 100;
  if (e.key === "ArrowDown") {
    if (activePanel === leftPanel) lenisLeft.scrollTo(leftScroll + STEP);
    else lenisRight.scrollTo(rightScroll + STEP);
    resetIdle();
  } else if (e.key === "ArrowUp") {
    if (activePanel === leftPanel) lenisLeft.scrollTo(leftScroll - STEP);
    else lenisRight.scrollTo(rightScroll - STEP);
    resetIdle();
  }
}
window.addEventListener("keydown", handleKeyScroll);

// bikin panel bisa fokus dengan klik → supaya arrow keys jalan
[leftPanel, rightPanel].forEach((panel) => {
  panel.setAttribute("tabindex", "0");
});

// === RENDER LOOP TER-UPDATE ===
// Penting: ScrollTrigger harus diupdate manual karena kita pakai Lenis di dalam wrapper
let isLooping = false; // Flag untuk nandain kita lagi transisi balik ke atas
function raf(time) {
  // 1. Update instance Lenis untuk kedua panel
  lenisLeft.raf(time);
  lenisRight.raf(time);

  // 2. Update GSAP ScrollTrigger supaya parallax tetap sinkron
  if (typeof ScrollTrigger !== "undefined") {
    ScrollTrigger.update();
  }

  // 3. Update variable tracker posisi scroll (berguna buat keyboard support lo)
  leftScroll = lenisLeft.scroll;
  rightScroll = lenisRight.scroll;

  // 4. Lanjut ke frame berikutnya
  requestAnimationFrame(raf);
}

// Mulai loop
requestAnimationFrame(raf);

// Assumes GSAP is loaded
const categories = document.querySelectorAll(".category");
const infos = document.querySelectorAll(".category-info");

let activeIndex = 0;
let isAnimating = false;

// initial setup: set all infos offscreen to the right, then show activeIndex
gsap.set(infos, { xPercent: 100, opacity: 0, pointerEvents: "none" });
gsap.set(infos[activeIndex], {
  xPercent: 0,
  opacity: 1,
  pointerEvents: "auto",
});

// initial categories visual
categories.forEach((c, i) => {
  c.classList.toggle("active", i === activeIndex);
  c.style.opacity = i === activeIndex ? "1" : "0.5";
});

categories.forEach((cat, index) => {
  cat.addEventListener("click", () => {
    if (index === activeIndex || isAnimating) return;

    const oldIndex = activeIndex;
    const newIndex = index;
    const direction = newIndex > oldIndex ? 1 : -1; // 1 = moving right → new enters from right, old exits left
    const oldInfo = infos[oldIndex];
    const newInfo = infos[newIndex];

    isAnimating = true;

    // Ensure newInfo start position is offscreen on the correct side (override any CSS)
    gsap.set(newInfo, {
      xPercent: 100 * direction,
      opacity: 0,
      pointerEvents: "none",
    });

    // Build timeline to coordinate exit + enter
    const tl = gsap.timeline({
      defaults: { duration: 0.6, ease: "power3.inOut" },
      onComplete: () => {
        // After animation, enable interaction only on active info
        infos.forEach((inf, i) =>
          gsap.set(inf, { pointerEvents: i === newIndex ? "auto" : "none" }),
        );
        isAnimating = false;
      },
    });

    // Exit old (move out to the left if direction=1, or to the right if direction=-1)
    tl.to(oldInfo, { xPercent: -100 * direction, opacity: 0 }, 0);

    // Slight overlap for nicer feel: new enters slightly after old starts exiting
    tl.to(newInfo, { xPercent: 0, opacity: 1 }, 0.08);

    // Update category visuals immediately (so user sees active state while animation plays)
    categories.forEach((c, i) => {
      c.classList.toggle("active", i === newIndex);
      c.style.opacity = i === newIndex ? "1" : "0.5";
    });

    // update activeIndex
    activeIndex = newIndex;
  });
});

const links = document.querySelectorAll(".--link");

links.forEach((link) => {
  const bg = link.querySelector(".link-bg");

  link.addEventListener("mouseenter", () => {
    gsap.to(bg, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 0.4,
      ease: "power4.out",
    });
  });

  link.addEventListener("mouseleave", () => {
    gsap.to(bg, {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      duration: 0.4,
      ease: "power4.inOut",
      onComplete: () => {
        gsap.to(bg, {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
          duration: 0.1,
        });
      },
    });
  });
});

const navMobile = document.querySelector(".nav-mobile");
const leftClose = document.querySelector(".left-panel-close");

navMobile.addEventListener("click", () => {
  gsap.to(".left-panel", {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    duration: 1,
    ease: "power3.inOut",
  });
});
leftClose.addEventListener("click", () => {
  gsap.to(".left-panel", {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    duration: 0.5,
    ease: "power4.out",
  });
});

// === GALLERY/SLIDESHOW LOGIC ===
const previewsContainers = document.querySelectorAll(
  ".project-preview .previews",
);

previewsContainers.forEach((container) => {
  // REVISI: Target diubah dari 'picture' ke 'img' (sesuai HTML baru)
  const images = container.querySelectorAll("img.preview-item");
  if (images.length <= 1) return;

  let currentIndex = 0;
  images[currentIndex].classList.add("active");

  let slideInterval;
  const slideDuration = 2500;

  function startSlideshow() {
    if (slideInterval) return;
    slideInterval = setInterval(() => {
      images[currentIndex].classList.remove("active");
      currentIndex = (currentIndex + 1) % images.length;
      images[currentIndex].classList.add("active");
    }, slideDuration);
  }

  function stopSlideshow() {
    clearInterval(slideInterval);
    slideInterval = null;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) startSlideshow();
        else stopSlideshow();
      });
    },
    { root: null, threshold: 0.5 },
  );

  observer.observe(container);
});

// ===========================================
// === PROJECT MODAL LOGIC (VIDEO & GALLERY) ===
// ===========================================

// Ambil semua tombol 'View' di Panel Kanan.
// Hanya section yang memiliki .project-preview yang akan memiliki tombol ini.
const viewButtons = document.querySelectorAll(".project-preview .view");

let currentGalleryImages = [];
let currentGalleryIndex = 0;
let currentVideoElement = null;
let currentModalType = null; // 'video' atau 'gallery'
let pausedOriginalVideo = null;

// Variable untuk Gallery Cursor
const galleryCursor = document.querySelector(".gallery-cursor");
const galleryCursorText = galleryCursor.querySelector("p");
let mouseX = 0,
  mouseY = 0;
let cursorX = 0,
  cursorY = 0;

// Tracking Mouse untuk Gallery Cursor
window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (modal.classList.contains("gallery-active")) {
    const isLeft = mouseX < window.innerWidth / 2;
    galleryCursorText.textContent = isLeft ? "Prev" : "Next";
  }
});

// Variable untuk sinkronisasi posisi mouse global
let galleryCursorX = 0, galleryCursorY = 0;
let activeCursors = []; // Array untuk menampung kursor project preview yang aktif

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  if (modal.classList.contains("gallery-active")) {
    const isLeft = mouseX < window.innerWidth / 2;
    galleryCursorText.textContent = isLeft ? "Prev" : "Next";
  }
});

gsap.ticker.add(() => {
  const lerpFactor = 0.15;
  const dt = 1.0 - Math.pow(1.0 - lerpFactor, gsap.ticker.deltaRatio());

  // A. UPDATE GALLERY CURSOR (Hanya jalan saat modal gallery aktif)
  if (modal.classList.contains("gallery-active")) {
    galleryCursorX += (mouseX - galleryCursorX) * dt;
    galleryCursorY += (mouseY - galleryCursorY) * dt;
    gsap.set(galleryCursor, { x: galleryCursorX, y: galleryCursorY });
  }

  // B. UPDATE PREVIEW CURSORS (Hanya jalan kalau modal TERTUTUP)
  if (!modal.classList.contains("active")) {
    activeCursors.forEach((c) => {
      const previewLerp = 0.12;
      // Gunakan nilai mouse internal masing-masing kursor
      c.pos.x += (c.mouse.x - c.pos.x) * previewLerp;
      c.pos.y += (c.mouse.y - c.pos.y) * previewLerp;
      gsap.set(c.cursor, { x: c.pos.x, y: c.pos.y });
    });
  }
});

// --- FUNGSI OPEN MODAL DENGAN TIMELINE ---
function openModal(projectSection) {
  resetIdle();
  const projectPreview = projectSection.querySelector(".project-preview");
  if (!projectPreview) return;

  const isVideo = projectPreview.querySelector("video");
  const isGallery = projectPreview.querySelector(".previews");

  modal.classList.remove("video-active", "gallery-active");
  modalGalleryInner.innerHTML = "";

  if (isVideo) {
    currentModalType = "video";
    modal.classList.add("video-active");
    pausedOriginalVideo = isVideo;
    pausedOriginalVideo.pause();
    const newVideo = pausedOriginalVideo.cloneNode(true);
    newVideo.setAttribute("controls", "");
    modalVideoContainer.innerHTML = "";
    modalVideoContainer.appendChild(newVideo);
    currentVideoElement = newVideo;
    currentVideoElement.play().catch(() => {});
  } else if (isGallery) {
    currentModalType = "gallery";
    modal.classList.add("gallery-active");

    gsap.set(galleryCursor, { scale: 0 });

    galleryCursorX = mouseX;
    galleryCursorY = mouseY;
    gsap.set(galleryCursor, { x: galleryCursorX, y: galleryCursorY });

    const originalImages = projectPreview.querySelectorAll(
      ".previews img.preview-item",
    );
    originalImages.forEach((img) => {
      const newImg = img.cloneNode(true);
      newImg.classList.remove("active", "preview-item");
      modalGalleryInner.appendChild(newImg);
      currentGalleryImages.push(newImg);
    });
    updateGallery(0, false);

    initDraggableGallery();
  }

  // --- GSAP TIMELINE OPENING ---
  const tl = gsap.timeline({
    onStart: () => {
      document.body.style.overflow = "hidden";
      modal.classList.add("active");
    },
  });

  tl.to(modal, { opacity: 1, duration: 0.3 })
    .to(
      modal.querySelector(".modal-overlay"),
      {
        backdropFilter: "blur(20px)",
        // webkitBackdropFilter: "blur(20px)",
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.2",
    )
    .to(
      modal.querySelector(".modal-content"),
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 0.8,
        ease: "power4.inOut",
      },
      "-=0.4",
    )
    .to(
      [modalCloseBtn, galleryCursor],
      {
        scale: 1,
        duration: 0.4,
        stagger: 0.1,
        ease: "back.out(1.7)",
      },
      "-=0.2",
    );
}

// --- FUNGSI CLOSE MODAL DENGAN TIMELINE ---
function closeModal() {
  const tl = gsap.timeline({
    onComplete: () => {
      if (currentVideoElement) {
        currentVideoElement.pause();
        currentVideoElement = null;
      }
      if (pausedOriginalVideo) {
        pausedOriginalVideo.play().catch(() => {});
        pausedOriginalVideo = null;
      }
      modal.classList.remove("active", "video-active", "gallery-active");
      document.body.style.overflow = "";
      currentModalType = null;
      currentGalleryImages = [];
      resetIdle();
    },
  });

  tl.to([modalCloseBtn, galleryCursor], {
    scale: 0,
    duration: 0.3,
    ease: "power2.in",
  })
    .to(
      modal.querySelector(".modal-content"),
      {
        clipPath: "polygon(0% 50%, 100% 50%, 100% 50%, 0% 50%)",
        duration: 0.6,
        ease: "power4.inOut",
      },
      "-=0.1",
    )
    .to(
      modal.querySelector(".modal-overlay"),
      {
        backdropFilter: "blur(0px)",
        // webkitBackdropFilter: "blur(0px)",
        duration: 0.4,
      },
      "-=0.4",
    )
    .to(modal, { opacity: 0, duration: 0.3 }, "-=0.2");
}

// --- B. LOGIKA NAVIGASI GALLERY DI MODAL ---
function updateGallery(newIndex, animate = true) {
  const total = currentGalleryImages.length;
  if (total === 0) return;

  if (newIndex >= total) newIndex = 0;
  if (newIndex < 0) newIndex = total - 1;

  const containerWidth = modalGalleryContainer.offsetWidth;
  const targetX = newIndex * -containerWidth; // Hitung dalam PIXEL agar sinkron dengan Draggable

  if (animate) {
    gsap.to(modalGalleryInner, {
      x: targetX, // Gunakan PIXEL, bukan PERSEN
      duration: 0.6,
      ease: "expo.out",
      overwrite: true,
      onComplete: () => {
        // SINKRONISASI: Paksa Draggable update posisi internalnya
        if (Draggable.get(modalGalleryInner)) {
          Draggable.get(modalGalleryInner).update();
        }
      },
    });
  } else {
    gsap.set(modalGalleryInner, { x: targetX });
    if (Draggable.get(modalGalleryInner)) {
      Draggable.get(modalGalleryInner).update();
    }
  }

  currentGalleryIndex = newIndex;
  resetZoom();
}

// Event listener untuk tombol close dan overlay
modalCloseBtn.addEventListener("click", closeModal);
modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

// Event listener untuk tombol ESC
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

// --- D. HUBUNGKAN KESELURUHAN PREVIEW DENGAN MODAL ---

const projectPreviews = document.querySelectorAll(".project-preview");
const videoClickTargets = document.querySelectorAll(".video-click-target");

// Kumpulkan semua elemen yang harus membuka modal
const modalTriggers = [...projectPreviews, ...videoClickTargets];

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    // **********************************************
    // TAMBAHAN KRUSIAL: Panggil resetIdle() di sini
    // **********************************************
    resetIdle();

    // Jika trigger adalah .project-preview, pastikan klik tidak datang dari elemen anak yang harus dikecualikan
    if (trigger.classList.contains("project-preview")) {
      e.preventDefault();
      if (e.target.closest("a") || e.target.tagName === "VIDEO") return;
    } else {
      e.preventDefault();
    }

    const projectSection = e.currentTarget.closest("section");

    if (projectSection) {
      // openModal SUDAH memanggil resetIdle(), tapi memanggilnya di sini juga
      // memastikan timer direset sebelum logika modal berjalan (double safety)
      openModal(projectSection);
    }
  });
});

function initDraggableGallery() {
  const containerWidth = modalGalleryContainer.offsetWidth;
  const totalImages = currentGalleryImages.length;

  if (Draggable.get(modalGalleryInner)) {
    Draggable.get(modalGalleryInner).kill();
  }

  // Penting: Reset index ke 0 setiap buka modal agar sinkron
  currentGalleryIndex = 0;
  gsap.set(modalGalleryInner, { x: 0 });

  Draggable.create(modalGalleryInner, {
    type: "x",
    // MODIFIKASI BOUNDS: Biar bisa didrag sampai gambar terakhir
    bounds: {
      minX: -(containerWidth * (totalImages - 1)),
      maxX: 0,
    },
    inertia: true,
    edgeResistance: 0.8,
    allowNativeTouchScrolling: false,

    onClick: function () {
      const clickX = this.pointerX; // Pakai pointerX milik Draggable agar lebih akurat
      const rect = modalGalleryContainer.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      const direction = clickX > midX ? 1 : -1;
      updateGallery(currentGalleryIndex + direction);
    },

    onDragStart: function () {
      gsap.to(galleryCursor, { scale: 0, duration: 0.2 });
    },

    onDragEnd: function () {
      const currentX = this.x;
      // Hitung index berdasarkan posisi pixel saat ini
      let targetIndex = Math.round(Math.abs(currentX / containerWidth));

      if (modalGalleryContainer.matches(':hover')) {
        gsap.to(galleryCursor, { scale: 1, duration: 0.3, ease: "back.out(1.7)" });
      }
      updateGallery(targetIndex);
    },
  });
}

const zoomSlider = document.querySelector(".zoom-slider");

zoomSlider.addEventListener("input", (e) => {
  const scaleValue = e.target.value;
  const currentImg = currentGalleryImages[currentGalleryIndex];
  const galleryDraggable = Draggable.get(modalGalleryInner);

  if (!currentImg) return;

  // 1. Animasikan Scale Gambar
  gsap.to(currentImg, {
    scale: scaleValue,
    duration: 0.1, // Responsif ngikutin jari/mouse
    overwrite: true
  });

  // 2. LOGIC PENTING: 
  // Jika sedang zoom, matikan draggable utama biar gak "pindah slide" gak sengaja
  if (scaleValue > 1.1) {
    if (galleryDraggable) galleryDraggable.disable();
    gsap.set(currentImg, { cursor: "move" });
    
    // Opsional: Buat gambar bisa di-drag detailnya saat dizoom
    if (!Draggable.get(currentImg)) {
      Draggable.create(currentImg, { type: "x,y", edgeResistance: 0.5 });
    } else {
      Draggable.get(currentImg).enable();
    }
  } else {
    // Balik normal
    if (galleryDraggable) galleryDraggable.enable();
    if (Draggable.get(currentImg)) Draggable.get(currentImg).disable();
    
    gsap.to(currentImg, { x: 0, y: 0, scale: 1, duration: 0.4 });
    gsap.set(currentImg, { cursor: "default" });
  }
});

// Reset zoom setiap kali pindah slide atau tutup modal
function resetZoom() {
  zoomSlider.value = 1;
  currentGalleryImages.forEach(img => {
    gsap.to(img, { scale: 1, x: 0, y: 0, duration: 0.4 });
    if (Draggable.get(img)) Draggable.get(img).disable();
  });
  if (Draggable.get(modalGalleryInner)) Draggable.get(modalGalleryInner).enable();
}

// Logic Show/Hide Gallery Cursor saat Masuk/Keluar Container
modalGalleryContainer.addEventListener("mouseenter", () => {
  if (modal.classList.contains("gallery-active")) {
    gsap.to(galleryCursor, {
      scale: 1,
      duration: 0.4,
      ease: "back.out(1.7)"
    });
  }
});

modalGalleryContainer.addEventListener("mouseleave", () => {
  gsap.to(galleryCursor, {
    scale: 0,
    duration: 0.3,
    ease: "power2.in"
  });
});

// ===============================
// CINEMATIC CURSOR + "View Project"
// ===============================
const previews = document.querySelectorAll(".project-preview");

previews.forEach((preview) => {
  const cursor = document.createElement("div");
  cursor.classList.add("cursor");
  cursor.textContent = "View Project";
  preview.appendChild(cursor);

  gsap.set(cursor, {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    xPercent: 5,
    yPercent: -95,
    clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
  });

  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
  let mouse = { x: 0, y: 0 };
  let pos = { x: 0, y: 0 };
  
  // Objek referensi kursor ini
  const cursorData = { cursor, mouse, pos };

  preview.addEventListener("mousemove", (e) => {
    const rect = preview.getBoundingClientRect();
    mouse.x = clamp(e.clientX - rect.left, 0, rect.width);
    mouse.y = clamp(e.clientY - rect.top, 0, rect.height);
  });

  preview.addEventListener("mouseenter", (e) => {
    const rect = preview.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    pos.x = mouse.x; // Langsung lompat ke posisi mouse biar gak telat
    pos.y = mouse.y;

    gsap.to(cursor, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 0.6,
      ease: "expo.out",
    });

    // Masukkan ke array ticker jika belum ada
    if (!activeCursors.includes(cursorData)) {
      activeCursors.push(cursorData);
    }
  });

  preview.addEventListener("mouseleave", () => {
    gsap.to(cursor, {
      clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
      duration: 0.6,
      ease: "expo.out",
    });
    
    // Hapus dari array ticker SEGERA agar tidak diproses saat kursor tidak terlihat
    activeCursors = activeCursors.filter(c => c !== cursorData);
  });
});

// ===============================
// CURSOR LEFT-PANEL (semua .box.--images)
// ===============================
const leftBoxes = document.querySelectorAll(".left-panel .box.--images");

leftBoxes.forEach((box) => {
  // Ambil elemen gambarnya secara spesifik di dalam box ini
  const imgContainer = box.querySelector(".box-img");

  // Mouse enter
  box.addEventListener("mouseenter", () => {
    gsap.to(imgContainer, {
      height: "13rem",
      duration: 0.8, // Sedikit dipercepat biar terasa responsif
      ease: "power4.out",
      overwrite: "auto", // Mencegah glitch kalau mouse keluar-masuk cepet banget
    });
  });

  // Mouse leave
  box.addEventListener("mouseleave", () => {
    gsap.to(imgContainer, {
      height: "16.25rem",
      duration: 0.8,
      ease: "power4.out",
      overwrite: "auto",
    });
  });
});

window.dispatchEvent(new Event("threejsReady"));
