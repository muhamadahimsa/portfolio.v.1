import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import Lenis from "https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm";
import SplitType from "https://cdn.jsdelivr.net/npm/split-type@0.3.4/+esm";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm";
import { Draggable } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/Draggable/+esm";

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
  syncTouch: true, // Menghubungkan scroll Lenis dengan jari
  syncTouchLerp: 0.08, // Memberikan efek "smooth" setelah jari lepas dari layar
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

function revealText(container) {
  const paragraphs = container.querySelectorAll("p");
  if (!paragraphs.length) return; // Guard clause jika p tidak ditemukan

  // 1. Lakukan split
  const split = new SplitType(paragraphs, {
    types: "lines",
    lineClass: "line",
  });

  // 2. Bungkus tiap baris
  split.lines.forEach((line) => {
    const text = line.innerHTML;
    line.innerHTML = `<span>${text}</span>`;
  });

  // 3. Seleksi target untuk GSAP
  const targetLines = container.querySelectorAll(".line span");

  // FIX: Cek apakah target ada sebelum di-animasiin
  if (targetLines.length > 0) {
    gsap.to(targetLines, {
      y: 0,
      duration: 1.4,
      stagger: 0.06,
      ease: "expo.out",
      force3D: true,
    });
  }
}

function hideText(container, direction) {
  const paragraphs = container.querySelectorAll("p");
  if (!paragraphs.length) return;

  // 1. Ambil target baris yang sudah di-split sebelumnya
  const targetLines = container.querySelectorAll(".line span");

  // 2. Cek apakah target ada
  if (targetLines.length > 0) {
    // Balikkan nilai y: jika direction 1 (naik), teks ke -100%. Jika -1 (turun), teks ke 100%
    return gsap.to(targetLines, {
      y: direction > 0 ? "-100%" : "100%",
      duration: 0.8, // Sedikit lebih cepat dari reveal (1.4) biar nggak dragging
      stagger: 0.04,
      ease: "expo.in", // Pakai expo.in supaya teks terasa "akselerasi" saat menghilang
      force3D: true,
    });
  }
}

// Initial Setup
gsap.set(infos, { display: "none" });
gsap.set(infos[activeIndex], { display: "flex" });
revealText(infos[activeIndex]);

categories.forEach((cat, index) => {
  cat.addEventListener("click", () => {
    if (index === activeIndex || isAnimating) return;

    isAnimating = true;
    const oldInfo = infos[activeIndex];
    const newInfo = infos[index];
    const direction = index > activeIndex ? 1 : -1;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
        activeIndex = index;
      },
    });

    // 1. OLD INFO: Geser keluar
    tl.add(hideText(oldInfo, direction));

    tl.to(oldInfo, {
      y: -40 * direction,
      duration: 0.6,
      ease: "expo.inOut",
      onComplete: () => {
        gsap.set(oldInfo, { display: "none", y: 0 });
      },
    });

    // 2. NEW INFO: Munculkan DULU baru di-reveal teksnya
    tl.set(
      newInfo,
      {
        display: "flex",
        y: 40 * direction,
      },
      "-=0.3",
    );

    tl.to(
      newInfo,
      {
        y: 0,
        duration: 0.8,
        ease: "expo.out",
        onStart: () => {
          // Panggil revealText tepat saat elemen mulai masuk agar kalkulasi line-nya pas
          revealText(newInfo);
        },
      },
      "-=0.3",
    );

    // UI Feedback
    categories.forEach((c, i) => {
      // Tetap toggle class untuk urusan styling dasar/state
      c.classList.toggle("active", i === index);

      // Tambahin animasi biar sinkron sama kemewahan teks
      gsap.to(c, {
        opacity: i === index ? 1 : 0.4, // Yang aktif terang, yang lain redup
        duration: 0.6,
        ease: "power2.out",
      });
    });
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

// Canvas WebGL Utama
const canvasContainer = document.createElement("div");
canvasContainer.style.position = "fixed";
canvasContainer.style.top = "0";
canvasContainer.style.left = "0";
canvasContainer.style.width = "100vw";
canvasContainer.style.height = "100vh";
canvasContainer.style.pointerEvents = "none";
canvasContainer.style.zIndex = "2";
const contentWrapper = document.getElementById("right-scroll"); // sesuaikan id-nya
if (contentWrapper) {
    contentWrapper.appendChild(canvasContainer);
} else {
    document.body.appendChild(canvasContainer); // fallback kalau id gak ketemu
}

// Setup Three.js Scene dasar
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10, 10);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// REVISI SHADER: Mendukung mode Cover (1.0) dan Contain (0.0) secara dinamis
const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D u_texture;    
    uniform vec2 u_mouse;
    uniform vec2 u_prevMouse;
    uniform float u_aberrationIntensity;
    
    uniform vec2 u_res;          
    uniform vec2 u_containerRes; 
    uniform float u_fitMode;     // 0.0 = Contain, 1.0 = Cover

    void main() {
        float containerRatio = u_containerRes.x / u_containerRes.y;
        float imageRatio = u_res.x / u_res.y;
        
        vec2 correctedUv = vUv;
        
        // Cek jika rasionya valid untuk menghindari pembagian dengan nol
        if(u_res.x > 0.0 && u_res.y > 0.0 && u_containerRes.x > 0.0 && u_containerRes.y > 0.0) {
            if (u_fitMode > 0.5) {
                // --- LOGIKA OBJECT-FIT: COVER (Untuk Video) ---
                if (containerRatio > imageRatio) {
                    float widthRatio = containerRatio / imageRatio;
                    correctedUv.y = (vUv.y - 0.5) * widthRatio + 0.5;
                } else {
                    float heightRatio = imageRatio / containerRatio;
                    correctedUv.x = (vUv.x - 0.5) * heightRatio + 0.5;
                }
            } else {
                // --- LOGIKA OBJECT-FIT: CONTAIN (Untuk Gambar) ---
                if (containerRatio > imageRatio) {
                    float widthRatio = imageRatio / containerRatio;
                    correctedUv.x = (vUv.x - 0.5) / widthRatio + 0.5;
                    if (correctedUv.x < 0.0 || correctedUv.x > 1.0) { discard; }
                } else {
                    float heightRatio = containerRatio / imageRatio;
                    correctedUv.y = (vUv.y - 0.5) / heightRatio + 0.5;
                    if (correctedUv.y < 0.0 || correctedUv.y > 1.0) { discard; }
                }
            }
        }

        vec2 grid = vec2(60.0, 60.0);
        vec2 invGrid = vec2(0.01666667, 0.01666667);

        vec2 gridUV = floor(correctedUv * grid) * invGrid;
        vec2 centerOfPixel = gridUV + invGrid;
        
        vec2 mouseDirection = u_mouse - u_prevMouse;
        vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
        float pixelDistanceToMouse = length(pixelToMouseDirection);
        float strength = smoothstep(0.3, 0.0, pixelDistanceToMouse);
 
        vec2 uvOffset = strength * -mouseDirection * 0.2;
        vec2 uv = correctedUv - uvOffset;

        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { discard; }

        float shift = strength * u_aberrationIntensity * 0.01;

        vec4 colorR = texture2D(u_texture, uv + vec2(shift, 0.0));
        vec4 colorG = texture2D(u_texture, uv);
        vec4 colorB = texture2D(u_texture, uv - vec2(shift, 0.0));

        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
    }
`;

const previewItems = [];
const htmlPreviews = document.querySelectorAll(".project-preview");
const textureLoader = new THREE.TextureLoader();

htmlPreviews.forEach((previewEl) => {
  let texture;
  let texturesArray = [];
  let imagesElements = [];
  const videoEl = previewEl.querySelector("video");
  let fitMode = 0.0; // Default gambar = 0.0 (Contain)
  
  if (videoEl) {
    texture = new THREE.VideoTexture(videoEl);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    fitMode = 1.0; // Video = 1.0 (Cover)
  } else {
    imagesElements = Array.from(previewEl.querySelectorAll("img.preview-item"));
    if (imagesElements.length > 0) {
      texturesArray = imagesElements.map(img => textureLoader.load(img.src));
      texture = texturesArray[0];
      imagesElements[0].classList.add("active");
    } else {
      const singleImg = previewEl.querySelector("img");
      texture = singleImg ? textureLoader.load(singleImg.src) : new THREE.Texture();
    }
  }

  // REVISI: Tambahkan uniform u_fitMode ke shader
  const uniforms = {
    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    u_prevMouse: { value: new THREE.Vector2(0.5, 0.5) },
    u_aberrationIntensity: { value: 0.0 },
    u_texture: { value: texture },
    u_res: { value: new THREE.Vector2(1, 1) }, // Akan di-update begitu asset siap
    u_containerRes: { value: new THREE.Vector2(1, 1) },
    u_fitMode: { value: fitMode }
  };

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const itemData = {
    element: previewEl,
    videoElement: videoEl || null, // Simpan reference video jika ada
    mesh: mesh,
    mousePosition: { x: 0.5, y: 0.5 },
    targetMousePosition: { x: 0.5, y: 0.5 },
    prevPosition: { x: 0.5, y: 0.5 },
    aberrationIntensity: 0.0,
    easeFactor: 0.02,
    isHovered: false,
    
    hasSlideshow: texturesArray.length > 1,
    textures: texturesArray,
    images: imagesElements,
    currentIndex: 0,
    slideTimer: 0,
    slideDuration: 2.5,
    isIntersecting: false
  };

  // REVISI: Ambil resolusi video secara aman lewat event loadedmetadata
  if (videoEl) {
    if (videoEl.videoWidth > 0) {
      mesh.material.uniforms.u_res.value.set(videoEl.videoWidth, videoEl.videoHeight);
    } else {
      videoEl.addEventListener('loadedmetadata', () => {
        mesh.material.uniforms.u_res.value.set(videoEl.videoWidth, videoEl.videoHeight);
      });
    }
  } else if (texturesArray.length > 0) {
    texture.image?.addEventListener('load', () => {
      if(texture.image) {
        mesh.material.uniforms.u_res.value.set(texture.image.width, texture.image.height);
      }
    });
  }

  previewEl.addEventListener("mousemove", (e) => {
    itemData.easeFactor = 0.02;
    const rect = previewEl.getBoundingClientRect();
    itemData.prevPosition = { ...itemData.targetMousePosition };
    itemData.targetMousePosition.x = (e.clientX - rect.left) / rect.width;
    itemData.targetMousePosition.y = (e.clientY - rect.top) / rect.height;
    itemData.aberrationIntensity = 1.0;
  });

  previewEl.addEventListener("mouseenter", (e) => {
    itemData.isHovered = true;
    itemData.easeFactor = 0.02;
    const rect = previewEl.getBoundingClientRect();
    itemData.mousePosition.x = itemData.targetMousePosition.x = (e.clientX - rect.left) / rect.width;
    itemData.mousePosition.y = itemData.targetMousePosition.y = (e.clientY - rect.top) / rect.height;
  });

  previewEl.addEventListener("mouseleave", () => {
    itemData.isHovered = false;
    itemData.easeFactor = 0.05;
    itemData.targetMousePosition = { ...itemData.prevPosition };
  });

  previewItems.push(itemData);
});

// Masih memantau target container slideshow (.previews) maupun target wrapper video
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const foundItem = previewItems.find(item => item.element.contains(entry.target));
      if (foundItem) {
        foundItem.isIntersecting = entry.isIntersecting;
      }
    });
  },
  { root: null, threshold: 0.3 }
);

htmlPreviews.forEach((previewEl) => {
  const target = previewEl.querySelector(".previews") || previewEl.querySelector(".project-preview-wrapper");
  if(target) observer.observe(target);
});

// Loop render utama
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const width = window.innerWidth;
  const height = window.innerHeight;

  previewItems.forEach((item) => {
    const rect = item.element.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > height) {
      item.mesh.visible = false;
      return;
    }
    item.mesh.visible = true;

    item.mesh.scale.set(rect.width / width, rect.height / height, 1);
    const posX = (rect.left + rect.width / 2) / width - 0.5;
    const posY = -(rect.top + rect.height / 2) / height + 0.5;
    item.mesh.position.set(posX, posY, 0);

    item.mesh.material.uniforms.u_containerRes.value.set(rect.width, rect.height);

    // REVISI: Ambil resolusi real video setiap frame jika di awal gagal termuat
    if (item.videoElement) {
      if (item.videoElement.videoWidth > 0) {
        item.mesh.material.uniforms.u_res.value.set(item.videoElement.videoWidth, item.videoElement.videoHeight);
      }
    } else {
      const currentTex = item.mesh.material.uniforms.u_texture.value;
      if (currentTex && currentTex.image) {
        item.mesh.material.uniforms.u_res.value.set(currentTex.image.width, currentTex.image.height);
      }
    }

    // Logic slideshow (Hanya jalan kalau item punya slideshow gambar)
    if (item.hasSlideshow && item.isIntersecting) {
      item.slideTimer += delta;
      if (item.slideTimer >= item.slideDuration) {
        item.slideTimer = 0;

        item.images[item.currentIndex].classList.remove("active");
        item.currentIndex = (item.currentIndex + 1) % item.textures.length;
        item.images[item.currentIndex].classList.add("active");
        
        const activeTexture = item.textures[item.currentIndex];
        item.mesh.material.uniforms.u_texture.value = activeTexture;

        if (activeTexture.image) {
          item.mesh.material.uniforms.u_res.value.set(activeTexture.image.width, activeTexture.image.height);
        }
      }
    }

    item.mousePosition.x += (item.targetMousePosition.x - item.mousePosition.x) * item.easeFactor;
    item.mousePosition.y += (item.targetMousePosition.y - item.mousePosition.y) * item.easeFactor;

    item.mesh.material.uniforms.u_mouse.value.set(item.mousePosition.x, 1.0 - item.mousePosition.y);
    item.mesh.material.uniforms.u_prevMouse.value.set(item.prevPosition.x, 1.0 - item.prevPosition.y);

    item.aberrationIntensity = Math.max(0.0, item.aberrationIntensity - 0.05);
    item.mesh.material.uniforms.u_aberrationIntensity.value = item.aberrationIntensity;
  });

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
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
let galleryCursorX = 0,
  galleryCursorY = 0;
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

let lastX = 0;
let velocityX = 0;

function initDraggableGallery() {
  const containerWidth = modalGalleryContainer.offsetWidth;
  const totalImages = currentGalleryImages.length;

  if (Draggable.get(modalGalleryInner)) {
    Draggable.get(modalGalleryInner).kill();
  }

  currentGalleryIndex = 0;
  gsap.set(modalGalleryInner, { x: 0 });

  Draggable.create(modalGalleryInner, {
    type: "x",
    bounds: {
      minX: -(containerWidth * (totalImages - 1)),
      maxX: 0,
    },
    inertia: false,
    dragResistance: 0,
    edgeResistance: 0.5, // Lebih empuk biar gak mental keras pas di ujung
    minimumMovement: 3, // KUNCI 1: Gerak 3px aja udah dianggap nempel, jadi enteng banget
    allowNativeTouchScrolling: false,

    onDragStart: function () {
      lastX = this.x;
      gsap.to(galleryCursor, { scale: 0, duration: 0.2 });
    },

    onDrag: function () {
      // Hitung percepatan real-time
      velocityX = this.x - lastX;
      lastX = this.x;
    },

    onDragEnd: function () {
      const dragDistance = this.x - this.startX;
      const absVelocity = Math.abs(velocityX);
      const absDistance = Math.abs(dragDistance);

      let targetIndex = currentGalleryIndex;

      // KUNCI 2: LOGIKA PINDAH AGRESIF
      // Kalau user nge-flick (kecepatan > 5) ATAU narik lebih dari 15% lebar layar
      if (absVelocity > 5 || absDistance > containerWidth * 0.15) {
        if (dragDistance > 0) {
          targetIndex = currentGalleryIndex - 1;
        } else {
          targetIndex = currentGalleryIndex + 1;
        }
      } else {
        // Balikin ke tempat semula kalau tarikannya terlalu lemah
        targetIndex = currentGalleryIndex;
      }

      // Final Clamp & Update
      targetIndex = Math.max(0, Math.min(totalImages - 1, targetIndex));
      currentGalleryIndex = targetIndex;

      updateGallery(targetIndex);

      if (modalGalleryContainer.matches(":hover")) {
        gsap.to(galleryCursor, {
          scale: 1,
          duration: 0.3,
          ease: "back.out(1.7)",
        });
      }
    },

    onClick: function () {
      const clickX = this.pointerX;

      const rect = modalGalleryContainer.getBoundingClientRect();

      const midX = rect.left + rect.width / 2;

      const direction = clickX > midX ? 1 : -1;

      updateGallery(currentGalleryIndex + direction);
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
    overwrite: true,
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
  currentGalleryImages.forEach((img) => {
    gsap.to(img, { scale: 1, x: 0, y: 0, duration: 0.4 });
    if (Draggable.get(img)) Draggable.get(img).disable();
  });
  if (Draggable.get(modalGalleryInner))
    Draggable.get(modalGalleryInner).enable();
}

// Logic Show/Hide Gallery Cursor saat Masuk/Keluar Container
modalGalleryContainer.addEventListener("mouseenter", () => {
  if (modal.classList.contains("gallery-active")) {
    gsap.to(galleryCursor, {
      scale: 1,
      duration: 0.4,
      ease: "back.out(1.7)",
    });
  }
});

modalGalleryContainer.addEventListener("mouseleave", () => {
  gsap.to(galleryCursor, {
    scale: 0,
    duration: 0.3,
    ease: "power2.in",
  });
});

// ===============================
// CINEMATIC CURSOR + "View Project"
// ===============================
const previews = document.querySelectorAll(".project-preview");

// previews.forEach((preview) => {
//   const cursor = document.createElement("div");
//   cursor.classList.add("cursor");
//   cursor.textContent = "View Project";
//   preview.appendChild(cursor);

//   gsap.set(cursor, {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     pointerEvents: "none",
//     xPercent: 5,
//     yPercent: -95,
//     clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
//   });

//   const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
//   let mouse = { x: 0, y: 0 };
//   let pos = { x: 0, y: 0 };

//   // Objek referensi kursor ini
//   const cursorData = { cursor, mouse, pos };

//   preview.addEventListener("mousemove", (e) => {
//     const rect = preview.getBoundingClientRect();
//     mouse.x = clamp(e.clientX - rect.left, 0, rect.width);
//     mouse.y = clamp(e.clientY - rect.top, 0, rect.height);
//   });

//   preview.addEventListener("mouseenter", (e) => {
//     const rect = preview.getBoundingClientRect();
//     mouse.x = e.clientX - rect.left;
//     mouse.y = e.clientY - rect.top;
//     pos.x = mouse.x; // Langsung lompat ke posisi mouse biar gak telat
//     pos.y = mouse.y;

//     gsap.to(cursor, {
//       clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
//       duration: 0.6,
//       ease: "expo.out",
//     });

//     // Masukkan ke array ticker jika belum ada
//     if (!activeCursors.includes(cursorData)) {
//       activeCursors.push(cursorData);
//     }
//   });

//   preview.addEventListener("mouseleave", () => {
//     gsap.to(cursor, {
//       clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
//       duration: 0.6,
//       ease: "expo.out",
//     });

//     // Hapus dari array ticker SEGERA agar tidak diproses saat kursor tidak terlihat
//     activeCursors = activeCursors.filter((c) => c !== cursorData);
//   });
// });

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
