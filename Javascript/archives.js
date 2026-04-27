import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm';
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { awards } from "./data.js";
import { vertexShader, fragmentShader } from "./shaderArchives.js";
import { playGlitchSound, startBackgroundHum } from "./audio.js";

let audioStarted = false;
function initAudio() {
  if (!audioStarted) {
    startBackgroundHum();
    audioStarted = true;
  }
}

// ====== DATA VIDEO & LINK & TITLE ======
const data = [
  {
    name: "./Asset/Videos/archive-1.mp4",
    title: "Sunset Over Hills",
  },
  {
    name: "./Asset/Videos/archive-2.mp4",
    title: "Mountain View",
  },
  {
    name: "./Asset/Videos/archive-3.mp4",
    title: "Ocean Waves",
  },
  {
    name: "./Asset/Videos/archive-4.mp4",
    title: "Forest Path",
  },
  {
    name: "./Asset/Videos/archive-5.mp4",
    title: "City Lights",
  },
  {
    name: "./Asset/Videos/archive-6.mp4",
    title: "Desert Dunes",
  },
  {
    name: "./Asset/Videos/archive-7.mp4",
    title: "River Stream",
  },
  {
    name: "./Asset/Videos/archive-8.mp4",
    title: "Starry Night",
  },
  {
    name: "./Asset/Videos/archive-9.mp4",
    title: "Snowy Peaks",
  },
  {
    name: "./Asset/Videos/archive-10.mp4",
    title: "Golden Fields",
  },
  {
    name: "./Asset/Videos/archive-11.mp4",
    title: "Desert Dunes",
  },
  {
    name: "./Asset/Videos/archive-12.mp4",
    title: "River Stream",
  },
  {
    name: "./Asset/Videos/archive-13.mp4",
    title: "Starry Night",
  },
  {
    name: "./Asset/Videos/archive-14.mp4",
    title: "Snowy Peaks",
  },
  {
    name: "./Asset/Videos/archive-15.mp4",
    title: "Golden Fields",
  },
  {
    name: "./Asset/Videos/archive-16.mp4",
    title: "Starry Night",
  },
  {
    name: "./Asset/Videos/archive-17.mp4",
    title: "Snowy Peaks",
  },
  {
    name: "./Asset/Videos/archive-18.mp4",
    title: "Golden Fields",
  },
  {
    name: "./Asset/Videos/archive-19.mp4",
    title: "Golden Fields",
  },
  {
    name: "./Asset/Videos/archive-20.mp4",
    title: "Golden Fields",
  },
];

// ====== KONFIGURASI BOX 3D (A-E) ======
const BOX_CONFIG = {
  // Dimensi dasar tetap sama
  wallWidth: 36,
  wallHeight: 20,
  depth: 12,
  // Grid Default (Desktop)
  gridX: 3,
  gridY: 2,
  // Grid Khusus Mobile (Akan diassign di dalam updateGallery)
};

// ====== KONFIGURASI KAMERA ======
const CAM_CONFIG = {
  desktop: {
    fov: 25,
    z: 37,
    limits: { x: 1.0, y: 1.0 }, // Batas drag desktop (jika pakai drag)
  },
  mobile: {
    fov: 100,
    z: 5,
    limits: { x: 0.6, y: 0.8 }, // Batas mobile dipersempit agar tidak keluar kotak
  },
};

// ====== PARAMETER GALLERY ======
const getParams = () => {
  const isMobile = window.innerWidth <= 756;
  return {
    curvature: 5,
    // Nilai ini sekarang jadi dinamis
    imageWidth: isMobile ? 0 : 12, // Di mobile kita set 0 karena nanti pakai kalkulasi dinding
    imageHeight: isMobile ? 0 : 6.75,
    depth: 10,
    elevation: 0,
    lookAtRange: 20,
    verticalCurvature: 0.5,
    totalVideos: 15,
    rangeX: 80,
    rangeY: 70,
  };
};

let isMobile = window.innerWidth <= 767;
let isCurrentlyMobile = window.innerWidth <= 756;
let isSmallMobile = window.innerWidth <= 576;
let infoOpen = false;
let menuOpen = false;
let archivesOpen = false;
// Gabungkan variabel koordinat UI lo ke sini
const horizontal = document.querySelector(".horizontal");
const vertical = document.querySelector(".vertical");
const coordX = document.getElementById("coordX");
const coordY = document.getElementById("coordY");
const dot = document.querySelector(".dot");

// Inisialisasi posisi di tengah
let mouseInput = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let smoothPos = { x: mouseInput.x, y: mouseInput.y };

// ====== SCENE SETUP ======
const scene = new THREE.Scene();

// Ambil config berdasarkan status mobile
const initialCam = isMobile ? CAM_CONFIG.mobile : CAM_CONFIG.desktop;

const camera = new THREE.PerspectiveCamera(
  initialCam.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, initialCam.z); // Gunakan jarak dari config

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// ====== HEADER ======
const header = document.querySelector(".header");
let headerRotationX = 0,
  headerRotationY = 0,
  headerTranslateZ = 0;

// ====== MOUSE & TARGET ======
let mouseX = 0,
  mouseY = 0;
let targetX = 0,
  targetY = 0;
let gyroX = 0,
  gyroY = 0;
let isDragging = false;
let lastPointerX = 0; // Referensi posisi pointer terakhir
let lastPointerY = 0;
const lookAtTarget = new THREE.Vector3(0, 0, 0);

// Fungsi untuk menangkap kemiringan
window.addEventListener("deviceorientation", (e) => {
    if (!e.beta || !e.gamma) return;

    // Beta (depan-belakang): Kita persempit jangkauan geraknya
    // Netral di 45 derajat, maksimal gerak cuma 15 derajat ke atas/bawah
    let tiltY = (e.beta - 45) * 0.01; 
    gyroY = Math.max(-0.15, Math.min(0.15, tiltY)); // Batas atas/bawah dipersempit

    // Gamma (kiri-kanan): Maksimal gerak cuma 20 derajat ke kiri/kanan
    let tiltX = e.gamma * 0.01;
    gyroX = Math.max(-0.2, Math.min(0.2, tiltX)); // Batas kiri/kanan dipersempit
  },
  true
);

// ========================================================
// 🟩 MOBILE TOUCH DRAG + INERTIA
// ========================================================
if (window.innerWidth <= 1200) {
  let isDragging = false;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let inertiaActive = false;

  const damping = 0.95;
  const sensitivity = 0.003;

  function onTouchStart(e) {
    if (menuOpen) return;
    if (e.touches.length === 1) {
      isDragging = true;
      inertiaActive = false;
      velocityX = 0;
      velocityY = 0;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }

  function onTouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;

    // Sensitivitas khusus mobile agar dragging terasa ringan
    const mobileSensitivity = 0.005;

    // Update mouseX/Y secara akumulatif
    mouseX += deltaX * mobileSensitivity;
    mouseY += deltaY * mobileSensitivity;

    // Simpan velocity untuk inertia
    velocityX = deltaX * mobileSensitivity;
    velocityY = deltaY * mobileSensitivity;

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }

  function applyInertia() {
    if (!inertiaActive) return;

    mouseX += velocityX;
    mouseY += velocityY;

    // Pakai isMobile atau isCurrentlyMobile yang global tadi
    const activeLimit = isMobile
      ? CAM_CONFIG.mobile.limits
      : CAM_CONFIG.desktop.limits;

    // CLAMPING
    mouseX = Math.max(-activeLimit.x, Math.min(activeLimit.x, mouseX));
    mouseY = Math.max(-activeLimit.y, Math.min(activeLimit.y, mouseY));

    velocityX *= damping;
    velocityY *= damping;

    if (Math.abs(velocityX) < 0.0001 && Math.abs(velocityY) < 0.0001) {
      inertiaActive = false;
    } else {
      requestAnimationFrame(applyInertia);
    }
  }

  // Di dalam onTouchEnd, panggil fungsinya
  function onTouchEnd() {
    isDragging = false;
    inertiaActive = true;
    applyInertia(); // Jalankan loop hanya saat dibutuhkan
  }

  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  applyInertia();
}

// ====== RAYCASTER ======
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ====== CREATE VIDEO ELEMENT ======
function createVideoElement(videoSource) {
  const video = document.createElement("video");
  video.src = videoSource;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.pause();
  return video;
}

// ====== CREATE VIDEO GROUP ======
let videos = [];

// ====== UPDATE GALLERY (RE-ARCHITECTURE) ======
function updateGallery() {
  // --- 1. CLEANUP & POOL ---
  videos.forEach((group) => {
    group.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    if (group.userData.video) {
      group.userData.video.pause();
      group.userData.video.src = "";
      group.userData.video.remove();
    }
    scene.remove(group);
  });
  videos = [];

  let videoPool = [];

  const getNextVideo = () => {
    // Jika pool kosong, isi ulang dengan seluruh data dan acak urutannya
    if (videoPool.length === 0) {
      videoPool = [...data].sort(() => Math.random() - 0.5);
    }
    // Ambil video terakhir dari pool (pop jauh lebih cepat dari splice)
    return videoPool.pop();
  };

  // --- 2. KONTROL PANEL & PARAMETER (SOLUSI ERROR) ---
  const isCurrentlyMobile = window.innerWidth <= 756;
  const currentParams = getParams(); // Mendefinisikan parameter agar tidak ReferenceError

  const mobileAdjust = {
    depth: 6, // Kedalaman lorong mobile
    frontWidth: 9, // Lebar dinding depan mobile
    frontHeight: 20, // Tinggi dinding depan mobile
    sideHeight: 20, // Tinggi dinding samping mobile
    topBottomWidth: 9, // Lebar dinding atas/bawah mobile
    topBottomHeight: 7.4, // Panjang dinding atas/bawah mobile
  };

  // Logika penentuan dimensi dinamis
  const currentDepth = isCurrentlyMobile
    ? mobileAdjust.depth
    : BOX_CONFIG.depth;
  const wallW = isCurrentlyMobile
    ? mobileAdjust.frontWidth
    : BOX_CONFIG.wallWidth;
  const wallH = isCurrentlyMobile
    ? mobileAdjust.frontHeight
    : BOX_CONFIG.wallHeight;
  const sideH = isCurrentlyMobile
    ? mobileAdjust.sideHeight
    : BOX_CONFIG.wallHeight;
  const tbWidth = isCurrentlyMobile
    ? mobileAdjust.topBottomWidth
    : BOX_CONFIG.wallWidth;
  const tbHeight = isCurrentlyMobile
    ? mobileAdjust.topBottomHeight
    : currentDepth * 2;

  const getGridConfig = (wallLabel) => {
    if (!isCurrentlyMobile) {
      if (wallLabel === "side") return { x: 2, y: 2 };
      if (wallLabel === "topbottom") return { x: 3, y: 2 };
      return { x: BOX_CONFIG.gridX, y: BOX_CONFIG.gridY };
    }
    if (wallLabel === "topbottom") return { x: 1, y: 1 };
    return { x: 1, y: 4 };
  };

  const placeWall = (
    type,
    wallLabel,
    width,
    height,
    zPos,
    rotY = 0,
    rotX = 0,
  ) => {
    const { x: countX, y: countY } = getGridConfig(wallLabel);

    for (let i = 0; i < countX; i++) {
      for (let j = 0; j < countY; j++) {
        const videoData = getNextVideo();

        let planeW, planeH;
        if (isCurrentlyMobile) {
          planeW = width / countX;
          if (wallLabel !== "topbottom") {
            planeH = planeW / (16 / 9);
            if (planeH > height / countY) {
              planeH = height / countY;
              planeW = planeH * (16 / 9);
            }
          } else {
            planeH = height / countY;
          }
        } else {
          // Menggunakan currentParams yang sudah didefinisikan di scope updateGallery
          planeW = currentParams.imageWidth;
          planeH = currentParams.imageHeight;
        }

        const x = (i - (countX - 1) / 2) * (width / countX);
        const y = (j - (countY - 1) / 2) * (height / countY);

        let finalX = x,
          finalY = y,
          finalZ = zPos;

        if (type === "side") {
          finalX = zPos;
          // GESER DI SINI:
          // Di desktop biarkan di tengah (x),
          // Di mobile geser ke belakang agar menyentuh dinding depan (-currentDepth)
          finalZ = isCurrentlyMobile ? x - currentDepth / 2 : x;
        } else if (type === "topbottom") {
          finalY = zPos;
          finalZ = isCurrentlyMobile ? y - (currentDepth - tbHeight / 2) : y;
        }

        const geometry = new THREE.PlaneGeometry(planeW, planeH);
        const video = createVideoElement(videoData.name);
        const videoTexture = new THREE.VideoTexture(video);
        const material = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: videoTexture },
            time: { value: 0.0 },
            glitchIntensity: { value: 0.0 },
            imageAspect: { value: 16 / 9 },
            planeAspect: { value: planeW / planeH },
            iResolution: {
              value: new THREE.Vector2(window.innerWidth, window.innerHeight),
            },
          },
          vertexShader,
          fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
        });

        const plane = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(plane);
        group.position.set(finalX, finalY, finalZ);
        group.rotation.set(rotX, rotY, 0);

        group.userData = {
          video,
          basePosition: { x: finalX, y: finalY, z: finalZ },
          baseRotation: { x: rotX, y: rotY, z: 0 },
        };

        scene.add(group);
        videos.push(group);
      }
    }
  };

  // --- 3. EKSEKUSI PEMASANGAN ---

  // Depan (E)
  placeWall("front", "front", wallW, wallH, -currentDepth, 0, 0);

  // Samping (A & C)
  placeWall(
    "side",
    "side",
    currentDepth * 2,
    sideH,
    -wallW / 2,
    Math.PI / 2,
    0,
  );
  placeWall(
    "side",
    "side",
    currentDepth * 2,
    sideH,
    wallW / 2,
    -Math.PI / 2,
    0,
  );

  // Atas & Bawah (B & D)
  placeWall(
    "topbottom",
    "topbottom",
    tbWidth,
    tbHeight,
    wallH / 2,
    0,
    Math.PI / 2,
  );
  placeWall(
    "topbottom",
    "topbottom",
    tbWidth,
    tbHeight,
    -wallH / 2,
    0,
    -Math.PI / 2,
  );
}

// ====== POINTER INTERACTION (MOUSE & TOUCHSCREEN) ======
let currentlyHovered = null;

// Mulai Drag / Sentuh
document.addEventListener("pointerdown", (e) => {
  if (isMouseOverOverlay(e)) return;
  isDragging = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  // Set pointer capture supaya gerakan tetap terbaca meski keluar jendela
  if (renderer.domElement.setPointerCapture) {
    renderer.domElement.setPointerCapture(e.pointerId);
  }
});

// Lepas Drag / Sentuh
document.addEventListener("pointerup", (e) => {
  isDragging = false;
  if (renderer.domElement.releasePointerCapture) {
    renderer.domElement.releasePointerCapture(e.pointerId);
  }
});

// Gerakan Pointer (Hover atau Drag)
document.addEventListener("pointermove", (event) => {
  if (menuOpen) return;

  // 1. Update Input Mentah untuk UI (Pixel)
  mouseInput.x = event.clientX;
  mouseInput.y = event.clientY;

  // 2. Logika Drag & Parallax (Kamera)
  if (isDragging) {
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;

    // Sensitivitas drag
    mouseX += deltaX * 0.003;
    mouseY += deltaY * 0.003;

    // TAMBAHKAN CLAMPING DI SINI JUGA:
    const activeLimit =
      window.innerWidth <= 756
        ? CAM_CONFIG.mobile.limits
        : CAM_CONFIG.desktop.limits;
    mouseX = Math.max(-activeLimit.x, Math.min(activeLimit.x, mouseX));
    mouseY = Math.max(-activeLimit.y, Math.min(activeLimit.y, mouseY));
  } else if (window.innerWidth > 1200) {
    // Mode Desktop: Langsung hitung target posisi kursor
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
  }

  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  // 3. JIKA KURSOR DI ATAS OVERLAY (Navigasi)
  if (isMouseOverOverlay(event)) {
    if (currentlyHovered) handleHoverOut();
    document.body.style.cursor = "default";
    return;
  }

  // 4. Jalankan Raycaster (Hanya ini yang mengontrol play/pause video sekarang)
  updateRaycaster(event);

  // Update Cursor style
  const intersects = raycaster.intersectObjects(
    videos.map((g) => g.children[0]),
  );
  document.body.style.cursor = intersects.length > 0 ? "pointer" : "default";
});

// ====== RAYCASTER FUNCTION (REVISED FULL) ======
function updateRaycaster(event, isClick = false) {
  // REVISI: Di mobile, cegah auto-play saat dragging (isDragging).
  // Video hanya boleh ganti/play jika ini adalah event 'click' (isClick === true)
  if (window.innerWidth <= 1200 && !isClick) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    videos.map((g) => g.children[0]),
  );

  if (intersects.length > 0) {
    const newHovered = intersects[0].object.parent;

    // REVISI: Jika objek yang kena raycast berbeda dengan yang sedang aktif
    if (newHovered !== currentlyHovered) {
      handleHoverIn(newHovered);
    }
  } else {
    // REVISI: Jika klik/hover di area kosong, matikan video yang sedang aktif
    if (currentlyHovered) handleHoverOut();
  }
}

function handleHoverIn(group) {
  if (currentlyHovered && currentlyHovered !== group) handleHoverOut();
  currentlyHovered = group;

  const video = group.userData.video;
  const mat = group.children[0].material;

  initAudio();
  playGlitchSound();

  // Glitch tetap ada, tapi POSISI (Z) TIDAK BERUBAH
  const tl = gsap.timeline();
  tl.to(mat.uniforms.glitchIntensity, { value: 1.3, duration: 0.15 }).to(
    mat.uniforms.glitchIntensity,
    {
      value: 0.0,
      duration: 0.25,
      onStart: () => {
        if (currentlyHovered === group) video.play().catch(() => {});
      },
    },
  );

  // Redupkan yang lain (Glitch saja, posisi tetap diam)
  videos.forEach((v) => {
    if (v !== group) {
      gsap.to(v.children[0].material.uniforms.glitchIntensity, {
        value: 0.6,
        duration: 0.4,
      });
      if (v.children[1])
        gsap.to(v.children[1].material, { opacity: 0.1, duration: 0.4 });
    }
  });
}

function handleHoverOut() {
  if (!currentlyHovered) return;

  const video = currentlyHovered.userData.video;
  video.pause();
  // video.currentTime = 0; // Aktifkan ini kalau mau video reset ke awal tiap keluar hover

  videos.forEach((group) => {
    // Reset Glitch ke 0
    gsap.to(group.children[0].material.uniforms.glitchIntensity, {
      value: 0,
      duration: 0.4,
    });
  });

  currentlyHovered = null;
}

window.addEventListener("click", (event) => {
  if (menuOpen || isMouseOverOverlay(event)) return;

  if (window.innerWidth > 1200) {
    // --- MODE DESKTOP ---
  } else {
    // --- MODE MOBILE/RESPONSIVE ---
    // Gunakan parameter true untuk memberitahu bahwa ini adalah klik manual
    updateRaycaster(event, true);
  }
});

// ====== RESIZE ======
window.addEventListener("resize", () => {
  isMobile = window.innerWidth <= 767;
  isCurrentlyMobile = window.innerWidth <= 756;

  // Ambil config terbaru
  const targetCam = isMobile ? CAM_CONFIG.mobile : CAM_CONFIG.desktop;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = targetCam.fov; // Update FOV otomatis
  camera.position.z = targetCam.z; // Update Jarak otomatis
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  updateGallery();
});

// ====== CEK OVERLAY HTML ======
function isMouseOverOverlay(event) {
  const selectorsToExclude = "nav, .archives-btn, .archives";
  return event.target.closest(selectorsToExclude) !== null;
}

// ====== RUN ======
updateGallery();

gsap.ticker.add(() => {
  // 1. UPDATE POSISI SMOOTH (Tetap jalan mau archive buka atau tutup)
  smoothPos.x += (mouseInput.x - smoothPos.x) * 0.1; // naikin dikit angkanya biar lebih responsif
  smoothPos.y += (mouseInput.y - smoothPos.y) * 0.1;

  // 2. UPDATE UI DOT & LINE (Tetap jalan)
  gsap.set(horizontal, { top: smoothPos.y });
  gsap.set(vertical, { left: smoothPos.x });
  gsap.set(dot, { x: smoothPos.x, y: smoothPos.y });

  coordX.textContent = Math.round(smoothPos.x);
  coordY.textContent = Math.round(smoothPos.y);

  // -------------------------------------------------------
  // 3. LOGIC YANG BERHENTI SAAT ARCHIVE BUKA (Three.js & Kamera)
  // -------------------------------------------------------
  if (archivesOpen) return;

  // Memastikan mouseX & mouseY tidak pernah keluar batas config
  const activeLimit = isMobile
    ? CAM_CONFIG.mobile.limits
    : CAM_CONFIG.desktop.limits;
  mouseX = Math.max(-activeLimit.x, Math.min(activeLimit.x, mouseX));
  mouseY = Math.max(-activeLimit.y, Math.min(activeLimit.y, mouseY));

  // Update Kamera & Header (Hanya saat archive tutup)
  targetX += (mouseX + gyroX - targetX) * 0.02;
  targetY += (mouseY + gyroY - targetY) * 0.02;

  header.style.transform = `translate(-50%,-50%) perspective(1000px)
    rotateX(${-targetY * 20}deg) rotateY(${targetX * 20}deg)`;

  const lookAtTarget = new THREE.Vector3(targetX * 10, -targetY * 10, -20);
  camera.lookAt(lookAtTarget);

  // Render Three.js (Bisa dimatikan saat archive buka buat hemat RAM)
  videos.forEach((group) => {
    if (group.children[0].material.uniforms.time) {
      group.children[0].material.uniforms.time.value =
        performance.now() * 0.001;
    }
  });

  renderer.render(scene, camera);
});

// Archives
const archiveToggles = document.querySelectorAll(".btn-list");
const archiveClose = document.querySelector(".btn-globe");
const archives = document.querySelector(".archives");
const siteWrapper = document.querySelector(".site-wrapper");
const archiveWrapper = document.querySelector(".archive-wrapper");

// ====== ARCHIVES LOGIC (FIXED) ======
let archiveLenis = null; // Biarkan ini global

function initArchiveLenis() {
  if (archiveLenis) archiveLenis.destroy(); // Bersihkan yang lama

  archiveLenis = new Lenis({
    wrapper: archives, // Ini .archives (fixed, 100vh)
    content: archiveWrapper, // Ini .archive-wrapper (isinya panjang)
    duration: 1.5,
    lerp: 0.08, // Naikkan dikit biar gak terlalu "ngantuk" di mobile
    smoothWheel: true,
    smoothTouch: true, // WAJIB untuk mobile
    touchMultiplier: 1.5,
    infinite: false,
  });

  // Sinkronisasi ScrollTrigger jika ada animasi di dalam list archives
  archiveLenis.on('scroll', () => {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
  });

  function raf(time) {
    if (archiveLenis) {
      archiveLenis.raf(time);
      requestAnimationFrame(raf);
    }
  }
  requestAnimationFrame(raf);
}

// ====== NEW: Reset Preview on Button Hover ======
const archivesBtn = document.querySelector(".archives-btn");

if (archivesBtn) {
  archivesBtn.addEventListener("mouseenter", () => {
    // Kita pakai fungsi reset yang sudah lo buat sebelumnya
    resetAllAwards();
    activeAward = null; // Pastikan status active juga di-reset
  });
}

// Pastikan loop click handler-nya bener
archiveToggles.forEach((toggle) => {
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    archivesOpen = true;
    currentlyHovered = null;

    archives.scrollTop = 0;
    if (archiveLenis) archiveLenis.scrollTo(0, { immediate: true });

    archives.classList.add("active");
    document.body.style.overflow = "hidden";

    initArchiveLenis();

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
    });

    // Kita buat objek dummy buat nampung angka blur
    let blurObject = { value: 0 };

    tl.to(blurObject, {
      value: 20, // Target blur 20px
      duration: 1.2,
      onUpdate: () => {
        // Setiap frame, GSAP bakal update variabel CSS --blur pakai angka dari blurObject
        gsap.set(".archive-bg", {
          "--blur": `${blurObject.value}px`,
          opacity: blurObject.value / 20, // Opacity ikut naik seiring blur (opsional)
        });
      },
    })
      .to(
        ".archive-wrapper",
        {
          y: "0%",
          duration: 1,
        },
        "-=0.6",
      )
      .to(
        ".line",
        {
          backgroundColor: "#00000063",
          duration: 0.1,
        },
        "-=0.6",
      )
      .to(
        ".dot",
        {
          backgroundColor: "#000",
          duration: 0.1,
        },
        "-=0.6",
      );
  });
});

archiveClose.addEventListener("click", () => {
  archivesOpen = false;

  // 1. RESET SCROLL KE ATAS DULU
  // Ini kunci biar animasinya mulus dari titik 0
  if (archiveLenis) {
    archiveLenis.scrollTo(0, {
      immediate: true, // Langsung lompat ke atas tanpa animasi
    });
  } else {
    // Fallback kalau Lenis gak aktif
    archiveWrapper.scrollTop = 0;
  }

  // 2. JALANKAN ANIMASI TURUN
  gsap.to(".archive-wrapper", {
    y: "100%",
    duration: 1.0, // Sedikit dipercepat biar snappy
    ease: "power3.inOut", // InOut lebih smooth buat nutup total
    onComplete: () => {
      archives.classList.remove("active");
      document.body.style.overflow = "auto";

      // Cleanup Lenis
      if (archiveLenis) {
        archiveLenis.destroy();
        archiveLenis = null;
      }
    },
  });

  // Animasi lainnya tetep sama
  gsap.to(".archive-bg", {
    "--blur": "0px",
    duration: 0.5,
    ease: "power4.in",
  });

  gsap.to(".line", {
    backgroundColor: "rgba(255, 255, 255, 0.509)",
    duration: 0.1,
  });

  gsap.to(".dot", {
    backgroundColor: "#E6E6E6",
    duration: 0.1,
  });
});

const awardsListContainer = document.querySelector(".awards-list");
const awardPreview = document.querySelector(".award-preview");

const POSITIONS = {
  BOTTOM: 0,
  MIDDLE: -30,
  TOP: -60,
};

let lastMousePosition = { x: 0, y: 0 };
let activeAward = null;
let ticking = false;
let mouseTimeout = null;
let isMouseMoving = false;

// Fungsi untuk memaksa semua award balik ke posisi awal
function resetAllAwards() {
  awardsElements.forEach((award) => {
    const wrapper = award.querySelector(".award-wrapper");
    gsap.to(wrapper, {
      y: POSITIONS.BOTTOM,
      duration: 0.4,
      ease: "power2.out",
    });
  });

  const previewVideos = awardPreview.querySelectorAll("video");
  previewVideos.forEach((vid) => {
    // Tambahkan pengecekan agar tidak double-animate
    if (!vid.dataset.isclosing) {
      vid.dataset.isclosing = "true";

      gsap.to(vid, {
        clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
        webkitClipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
        duration: 0.5, // Samain dengan animatePreview biar smooth-nya pas
        ease: "power3.in",
        onComplete: () => {
          vid.pause();
          vid.src = "";
          vid.load();
          vid.remove();
        },
      });
    }
  });
}

awards.forEach((award) => {
  const awardElement = document.createElement("div");
  awardElement.className = "award";

  awardElement.innerHTML = `
      <div class= "award-wrapper">
        <div class="award-name">
          <div class="award-name-wrapper">
            <p>${award.name}</p>
            <p>${award.year}</p>
          </div>
          <p class="type">${award.type}</p>
        </div>
        <div class="award-project">
          <p>${award.project}</p>
          <p>${award.label}</p>
        </div>
        <div class="award-name">
          <div class="award-name-wrapper">
            <p>${award.name}</p>
            <p>${award.year}</p>
          </div>
          <p class="type">${award.type}</p>
        </div>
      </div>
    `;

  awardsListContainer.appendChild(awardElement);
});

const awardsElements = document.querySelectorAll(".award");

// --- 2. MODIFIKASI LOOP UTAMA (MERGER) ---
awardsElements.forEach((award, index) => {
  const wrapper = award.querySelector(".award-wrapper");

  // Fungsi internal untuk menjalankan logic video & animasi (Logic asli lo)
  const activateAwardLogic = () => {
    activeAward = award;

    gsap.to(wrapper, {
      y: POSITIONS.MIDDLE,
      duration: 0.4,
      ease: "power2.out",
    });

    const existingVideos = awardPreview.querySelectorAll("video");
    existingVideos.forEach((v) => {
      v.pause();
      v.style.zIndex = "1";
    });

    const targetSrc = `./Asset/Videos/archive-${index + 1}.mp4`;
    let video = Array.from(existingVideos).find(
      (v) => v.getAttribute("src") === targetSrc,
    );

    if (!video) {
      video = document.createElement("video");
      video.src = targetSrc;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";

      Object.assign(video.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        webkitClipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
        clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      });

      awardPreview.appendChild(video);
    }

    // --- 1. SET Z-INDEX ---
    video.style.zIndex = "2";

    // --- 2. JALANKAN PLAY DENGAN PENANGANAN ERROR (REVISI) ---
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Jika video berhasil play, baru jalankan animasi clipPath
          gsap.to(video, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            webkitClipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 0.5,
            ease: "power3.out",
          });
        })
        .catch((error) => {
          // Cegah warning "AbortError" muncul di console
          // Ini biasanya terjadi kalau user hover in-out dengan sangat cepat
          // console.log("Video play request was cleaned up/aborted.");
        });
    }
  };

  // --- PEMISAHAN EVENT BERDASARKAN DEVICE ---

  if (window.innerWidth > 1200) {
    // A. MODE DESKTOP: Tetap pakai Mouseenter & Mouseleave
    award.addEventListener("mouseenter", () => {
      activateAwardLogic();
    });

    award.addEventListener("mouseleave", (e) => {
      activeAward = null;
      const rect = award.getBoundingClientRect();
      const leavingFromTop = e.clientY < rect.top + rect.height / 2;
      const currentPosition = leavingFromTop ? POSITIONS.TOP : POSITIONS.BOTTOM;

      gsap.to(wrapper, {
        y: currentPosition,
        duration: 0.4,
        ease: "power2.out",
      });
    });
  } else {
    // B. MODE MOBILE/RESPONSIVE: Ganti jadi Klik
    award.addEventListener("click", (e) => {
      // Jika user klik award yang sama, maka tutup/reset
      if (activeAward === award) {
        resetAllAwards();
        activeAward = null;
      } else {
        // Bersihkan award lain dulu sebelum aktifkan yang baru
        resetAllAwards();
        activateAwardLogic();
      }
    });
  }
});

// Fungsi pembersih total saat kursor keluar dari area list
const animatePreview = () => {
  const awardsListRect = awardsListContainer.getBoundingClientRect();
  const isOutside =
    lastMousePosition.x < awardsListRect.left ||
    lastMousePosition.x > awardsListRect.right ||
    lastMousePosition.y < awardsListRect.top ||
    lastMousePosition.y > awardsListRect.bottom;

  if (isOutside) {
    const previewVideos = awardPreview.querySelectorAll("video");
    previewVideos.forEach((vid) => {
      if (!vid.dataset.isclosing) {
        vid.dataset.isclosing = "true";

        gsap.to(vid, {
          clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
          webkitClipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
          duration: 0.5,
          ease: "power3.in",
          onComplete: () => {
            vid.pause();
            vid.src = "";
            vid.remove();
          },
        });
      }
    });
  }
};

const updateAwards = () => {
  if (window.innerWidth <= 1200) return;
  animatePreview();

  if (activeAward) {
    const rect = activeAward.getBoundingClientRect();
    const isStillOver =
      lastMousePosition.x >= rect.left &&
      lastMousePosition.x <= rect.right &&
      lastMousePosition.y >= rect.top &&
      lastMousePosition.y <= rect.bottom;

    if (!isStillOver) {
      const wrapper = activeAward.querySelector(".award-wrapper");
      const leavingFromTop = lastMousePosition.y < rect.top + rect.height / 2;

      gsap.to(wrapper, {
        y: leavingFromTop ? POSITIONS.TOP : POSITIONS.BOTTOM,
        duration: 0.4,
        ease: "power2.out",
      });
      activeAward = null;
    }
  }

  awardsElements.forEach((award, index) => {
    if (award === activeAward) return;

    const rect = award.getBoundingClientRect();
    const isMouseOver =
      lastMousePosition.x >= rect.left &&
      lastMousePosition.x <= rect.right &&
      lastMousePosition.y >= rect.top &&
      lastMousePosition.y <= rect.bottom;

    if (isMouseOver) {
      const wrapper = award.querySelector(".award-wrapper");
      const enterFromTop = lastMousePosition.y < rect.top + rect.height / 2;

      gsap.to(wrapper, {
        y: POSITIONS.MIDDLE,
        duration: 0.4,
        ease: "power2.out",
      });
      activeAward = award;
    }
  });

  ticking = false;
};

document.addEventListener("mousemove", (e) => {
  lastMousePosition.x = e.clientX;
  lastMousePosition.y = e.clientY;

  isMouseMoving = true;
  if (mouseTimeout) {
    clearTimeout(mouseTimeout);
  }

  const awardsListRect = awardsListContainer.getBoundingClientRect();
  const isInsideAwardsList =
    lastMousePosition.x >= awardsListRect.left &&
    lastMousePosition.x <= awardsListRect.right &&
    lastMousePosition.y >= awardsListRect.top &&
    lastMousePosition.y <= awardsListRect.bottom;

  if (isInsideAwardsList) {
    mouseTimeout = setTimeout(() => {
      isMouseMoving = false;
      const images = awardPreview.querySelectorAll("img");
      if (images.length > 1) {
        const lastImage = images[images.length - 1];
        images.forEach((img) => {
          if (img !== lastImage) {
            gsap.to(img, {
              scale: 0,
              duration: 0.4,
              ease: "power2.out",
              onComplete: () => img.remove(),
            });
          }
        });
      }
    }, 2000);
  }

  animatePreview();
});

document.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateAwards();
      });
      ticking = true;
    }
  },
  { passive: true },
);

function disableTouchScroll(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
}

// ====== LOGIC CLICK OUTSIDE ======
window.addEventListener("click", (e) => {
  // Jika menu sedang buka atau archives tidak aktif, abaikan (opsional tergantung strukturmu)
  // if (!archivesOpen) return;

  // Cek apakah yang diklik BUKAN bagian dari awardsListContainer
  // dan juga pastikan kita sedang di mode mobile/responsive (innerWidth <= 1200)
  // karena di desktop hover sudah otomatis reset via mouseleave
  if (window.innerWidth <= 1200) {
    if (!awardsListContainer.contains(e.target)) {
      resetAllAwards();
      activeAward = null;
    }
  }
});

// --- LOGIKA MULTI-MAGNETIC BUTTONS ---
const allButtons = document.querySelectorAll(".--button");

allButtons.forEach((btnWrapper) => {
  // Kita cari elemen link/button dan teks di dalamnya
  const btn = btnWrapper.querySelector(".btn-wrapper");
  // Jika tidak ada span .btn-text, dia akan gerakkan isi button apa adanya
  const btnText = btn.querySelectorAll(".btn-text") || btn;

  btn.addEventListener("mousemove", (e) => {
    const rect = btn.getBoundingClientRect();

    // Hitung posisi mouse relatif terhadap titik tengah button
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Efek Magnetic: Button mengikuti mouse (power 0.3)
    gsap.to(btn, {
      x: x * 0.3,
      y: y * 0.3,
      duration: 0.6,
      ease: "power2.out",
    });

    // Efek Parallax: Teks mengikuti lebih pelan (power 0.1)
    // Ini yang bikin efek high-end karena ada kedalaman visual
    gsap.to(btnText, {
      x: x * 0.1,
      y: y * 0.1,
      duration: 0.6,
      ease: "power2.out",
    });
  });

  btn.addEventListener("mouseleave", () => {
    // Kembalikan button & teks ke posisi semula (Elastic Bounce)
    gsap.to([btn, btnText], {
      x: 0,
      y: 0,
      duration: 1,
      ease: "elastic.out(1, 0.3)",
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const btnTexts = document.querySelectorAll(".btn-text");
  const btnActive = document.querySelector(".btn-active");

  // Fungsi untuk mindahin kotak active
  function moveActiveBox(element) {
    // 1. Ambil posisi dan lebar elemen yang diklik
    const rect = {
      width: element.offsetWidth,
      left: element.offsetLeft,
    };

    // 2. Tambahkan sedikit 'padding' ke kotaknya biar nggak terlalu ngepas teks
    const padding = 16;

    // 3. Animasi pake GSAP
    gsap.to(btnActive, {
      left: rect.left - padding / 2,
      width: rect.width + padding,
      duration: 0.6,
      ease: "power4.inOut",
    });

    // 4. Update class warna teks
    btnTexts.forEach((btn) => btn.classList.remove("active-text"));
    element.classList.add("active-text");
  }

  // Set posisi awal (Globe) tanpa animasi biar nggak loncat saat page load
  const initialBtn = document.querySelector(".btn-globe");
  if (initialBtn) {
    const padding = 16;
    gsap.set(btnActive, {
      left: initialBtn.offsetLeft - padding / 2,
      width: initialBtn.offsetWidth + padding,
    });
  }

  // Event listener klik
  btnTexts.forEach((btn) => {
    btn.addEventListener("click", () => {
      moveActiveBox(btn);
    });
  });
});

window.dispatchEvent(new Event("threejsReady"));
