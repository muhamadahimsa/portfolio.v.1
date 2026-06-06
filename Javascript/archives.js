import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import Lenis from "https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm";
import { awards } from "./data.js";
import { vertexShader, fragmentShader } from "./shaderArchives.js";
import { playGlitchSound, startBackgroundHum } from "./audio.js";

gsap.registerPlugin(ScrollTrigger);

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
    z: 3,
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

const slides = [
  { name: "OSX DOCK INTERACTION", img: "./Asset/Videos/archive-1.mp4" },
  { name: "STARK SPLIT LOGIC", img: "./Asset/Videos/archive-2.mp4" },
  { name: "NAV ITERATION 01", img: "./Asset/Videos/archive-3.mp4" },
  { name: "MENU ITERATION 02", img: "./Asset/Videos/archive-4.mp4" },
  { name: "HOLOGRAPHIC DISTORTION", img: "./Asset/Videos/archive-5.mp4" },
  { name: "PROXIMITY SWELL", img: "./Asset/Videos/archive-6.mp4" },
  { name: "SHARP SLIDE V1", img: "./Asset/Videos/archive-7.mp4" },
  { name: "SCROLL REVEAL SYSTEM", img: "./Asset/Videos/archive-8.mp4" },
  { name: "ANGULAR TOPOGRAPHY", img: "./Asset/Videos/archive-9.mp4" },
  { name: "CHAOTIC TYPOGRAPHY", img: "./Asset/Videos/archive-10.mp4" },
  { name: "PIXELATED MENU", img: "./Asset/Videos/archive-11.mp4" },
  { name: "VELOCITY SCROLL", img: "./Asset/Videos/archive-12.mp4" },
  { name: "SEAMLESS TRANSITION", img: "./Asset/Videos/archive-13.mp4" },
  { name: "CARD STACK SEQUENCE", img: "./Asset/Videos/archive-14.mp4" },
  { name: "DYNAMIC CLIP 02", img: "./Asset/Videos/archive-15.mp4" },
  { name: "DEPTH PARALLAX", img: "./Asset/Videos/archive-16.mp4" },
  { name: "INTERACTIVE DRAG PARALLAX", img: "./Asset/Videos/archive-17.mp4" },
  { name: "COOL ASCII REVEAL", img: "./Asset/Videos/archive-18.mp4" },
  { name: "HIDDEN GLYPH", img: "./Asset/Videos/archive-19.mp4" },
  { name: "ASCII HOVER", img: "./Asset/Videos/archive-20.mp4" },
];

const config = {
  minHeight: 1,
  maxHeight: 1.5,
  aspectRatio: 1.5,
  gap: 0.05,
  smoothing: 0.05,
  distortionStrength: 2.5,
  distortionSmoothing: 0.1,
  momentumFriction: 0.95,
  momentumThreshold: 0.001,
  wheelSpeed: 0.01,
  wheelMax: 150,
  dragSpeed: 0.01,
  dragMomentum: 0.01,
  touchSpeed: 0.01,
  touchMomentum: 0.1,
};

const DISTORTION_CONFIG = {
  desktop: {
    minHeight: 4,
    maxHeight: 6,
    aspectRatio: 1.5,
    gap: 1.5,
  },
  mobile: {
    minHeight: 2.5,
    maxHeight: 4,
    aspectRatio: 1.2,
    gap: 1.0,
  },
};

let isMobile = window.innerWidth <= 767;
let isCurrentlyMobile = window.innerWidth <= 756;
let menuOpen = false;
let archivesOpen = false;
let isDragging = false;

// Inisialisasi posisi di tengah
let mouseInput = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let smoothPos = { x: mouseInput.x, y: mouseInput.y };

// ====== SCENE SETUP ======
const scene = new THREE.Scene();
const globeGroup = new THREE.Group();
scene.add(globeGroup);

const distortionGroup = new THREE.Group();
distortionGroup.visible = false; // Sembunyikan dulu
scene.add(distortionGroup);

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

// ====== MOUSE & TARGET ======
let mouseX = 0,
  mouseY = 0;
let targetX = 0,
  targetY = 0;
let gyroX = 0,
  gyroY = 0;
let lastPointerX = 0; // Referensi posisi pointer terakhir
let lastPointerY = 0;

// Fungsi untuk menangkap kemiringan
window.addEventListener(
  "deviceorientation",
  (e) => {
    if (!e.beta || !e.gamma) return;

    // Beta (depan-belakang): Kita persempit jangkauan geraknya
    // Netral di 45 derajat, maksimal gerak cuma 15 derajat ke atas/bawah
    let tiltY = (e.beta - 45) * 0.01;
    gyroY = Math.max(-0.15, Math.min(0.15, tiltY)); // Batas atas/bawah dipersempit

    // Gamma (kiri-kanan): Maksimal gerak cuma 20 derajat ke kiri/kanan
    let tiltX = e.gamma * 0.01;
    gyroX = Math.max(-0.2, Math.min(0.2, tiltX)); // Batas kiri/kanan dipersempit
  },
  true,
);

// ========================================================
// 🟩 MOBILE TOUCH DRAG + INERTIA
// ========================================================
if (window.innerWidth <= 1200) {
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

  if (!archivesOpen) {
    const targetCam = isMobile ? CAM_CONFIG.mobile : CAM_CONFIG.desktop;
    camera.fov = targetCam.fov;
    camera.position.z = targetCam.z;
    camera.updateProjectionMatrix();
  }

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

        globeGroup.add(group);
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
  if (isMouseOverOverlay(e) || archivesOpen) return;
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
  if (menuOpen || archivesOpen) return;

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
  if (!archivesOpen) {
    document.body.style.cursor = intersects.length > 0 ? "pointer" : "default";
  }
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
  if (menuOpen || isMouseOverOverlay(event) || archivesOpen) return;

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
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;

  // 1. UPDATE DATA DASAR LORONG (WAJIB BIAR GAK BASI)
  isMobile = width <= 767;
  isCurrentlyMobile = width <= 756;
  const targetCam = isMobile ? CAM_CONFIG.mobile : CAM_CONFIG.desktop;

  // 2. JIKA SEDANG DI ARCHIVE
  if (archivesOpen) {
    // LOCK kamera archive
    camera.fov = 45;
    camera.position.z = 5;
    camera.updateProjectionMatrix();

    // Update offset internal distortion
    let newStack = 0;
    meshes.forEach((mesh, i) => {
      const h = slideHeights[i];
      if (i === 0) newStack = h / 2;
      else {
        newStack += config.gap + h / 2;
        mesh.userData.offset = newStack;
        newStack += h / 2;
      }
    });
    loopLength = newStack + config.gap + slideHeights[0] / 2;
    halfLoop = loopLength / 2;

    // --- RAHASIA BIAR BTN-GLOBE GAK RUSAK ---
    // Update data gallery lorong di balik layar, tapi JANGAN sentuh kamera aslinya
    updateGallery();

    return; // STOP! Jangan biarkan settingan kamera lorong di bawah nimpa Z=5
  }

  // 3. JIKA SEDANG DI LORONG (NORMAL)
  // Logika lorong lo yang "sempurna" tetap di sini
  camera.fov = targetCam.fov;
  camera.position.z = targetCam.z;
  camera.updateProjectionMatrix();

  updateGallery();
});

// ====== CEK OVERLAY HTML ======
function isMouseOverOverlay(event) {
  const selectorsToExclude = "nav, .archives-btn, .archives";
  return event.target.closest(selectorsToExclude) !== null;
}

// ====== RUN ======
updateGallery();

let titleSplit, countSplit;

// Jangan pake 'const' atau 'let' lagi di sini, langsung isi variabel globalnya
titleSplit = new SplitType("#slide-title", {
  types: "lines",
  lineClass: "line",
});
countSplit = new SplitType("#slide-count", {
  types: "lines",
  lineClass: "line",
});

// Jalankan split untuk header juga kalau perlu
const headerSplit = new SplitType(".header h1", {
  types: "lines",
  lineClass: "line",
});

// ====== FUNGSI ANIMATE UTAMA ======
function animate(time) {
  const deltaTime = lastFrameTime ? (time - lastFrameTime) / 1000 : 0.016;
  lastFrameTime = time;

  // 1. UPDATE POSISI SMOOTH KURSOR
  smoothPos.x += (mouseInput.x - smoothPos.x) * 0.1;
  smoothPos.y += (mouseInput.y - smoothPos.y) * 0.1;

  // 2. LOGIKA JIKA ARCHIVE SEDANG TERBUKA (DISTORTION LIST)
  if (archivesOpen) {
    const previousScroll = scrollPosition;

    camera.rotation.set(0, 0, 0);
    camera.lookAt(0, 0, 0);

    if (!isDragging) {
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "grabbing";
    }

    if (isScrolling) {
      scrollTarget += scrollMomentum;
      scrollMomentum *= config.momentumFriction;
      if (Math.abs(scrollMomentum) < config.momentumThreshold)
        scrollMomentum = 0;
    }

    scrollPosition += (scrollTarget - scrollPosition) * config.smoothing;
    const frameDelta = scrollPosition - previousScroll;

    if (Math.abs(frameDelta) > 0.00001) {
      directionTarget = frameDelta > 0 ? 1 : -1;
    }
    scrollDirection += (directionTarget - scrollDirection) * 0.08;

    const velocity = Math.abs(frameDelta) / deltaTime;
    velocityHistory.push(velocity);
    velocityHistory.shift();
    const averageVelocity =
      velocityHistory.reduce((a, b) => a + b) / velocityHistory.length;

    if (averageVelocity > velocityPeak) velocityPeak = averageVelocity;
    const isDecelerating =
      averageVelocity / (velocityPeak + 0.001) < 0.7 && velocityPeak > 0.5;
    velocityPeak *= 0.99;

    if (velocity > 0.05)
      distortionTarget = Math.max(
        distortionTarget,
        Math.min(1, velocity * 0.1),
      );
    if (isDecelerating || averageVelocity < 0.2)
      distortionTarget *= isDecelerating ? 0.95 : 0.855;

    distortionAmount +=
      (distortionTarget - distortionAmount) * config.distortionSmoothing;
    const signedDistortion = distortionAmount * scrollDirection;

    let closestDistance = Infinity;
    let currentClosestIndex = -1;

    meshes.forEach((mesh) => {
      const { offset, index, video } = mesh.userData;
      let y = -(offset - wrap(scrollPosition, loopLength));
      y = wrap(y + halfLoop, loopLength) - halfLoop;
      mesh.position.y = y;

      const dist = Math.abs(y);
      if (dist < closestDistance) {
        closestDistance = dist;
        currentClosestIndex = index;
      }

      if (Math.abs(y) < 1.0) {
        // Angka 1.0 ini ambang batas "di tengah"
        if (video.paused) video.play().catch(() => {});
      } else {
        if (!video.paused) video.pause();
      }

      if (Math.abs(y) < halfLoop + config.maxHeight) {
        applyDistortion(mesh, y, config.distortionStrength * signedDistortion);
      }
    });

    if (
      currentClosestIndex !== -1 &&
      currentClosestIndex !== activeSlideIndex
    ) {
      activeSlideIndex = currentClosestIndex;

      const newTitle = slides[activeSlideIndex].name;
      const newCount = zeroPad(activeSlideIndex + 1);

      // 1. REVERT (Sekarang nggak akan error karena variabelnya global)
      if (titleSplit) titleSplit.revert();
      if (countSplit) countSplit.revert();

      // 2. UPDATE TEXT
      titleElement.innerText = newTitle;
      counterElement.innerText = newCount;

      // 3. RE-SPLIT & ASSIGN KEMBALI KE VARIABLE GLOBAL
      // Supaya slide berikutnya bisa me-revert hasil split yang ini
      titleSplit = new SplitType(titleElement, {
        types: "lines",
        lineClass: "line",
      });
      countSplit = new SplitType(counterElement, {
        types: "lines",
        lineClass: "line",
      });

      // 4. BUNGKUS OVERFLOW
      [titleSplit, countSplit].forEach((st) => {
        if (st && st.lines) {
          st.lines.forEach((line) => {
            line.innerHTML = `<div style="overflow:hidden; display:block;">${line.innerHTML}</div>`;
          });
        }
      });

      // 5. ANIMASI
      gsap.fromTo(
        [titleSplit.lines, countSplit.lines],
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.out",
        },
      );
    }
  }

  // 3. LOGIKA JIKA LORONG 3D AKTIF (ARCHIVE TUTUP)
  else {
    const activeLimit = isMobile
      ? CAM_CONFIG.mobile.limits
      : CAM_CONFIG.desktop.limits;
    mouseX = Math.max(-activeLimit.x, Math.min(activeLimit.x, mouseX));
    mouseY = Math.max(-activeLimit.y, Math.min(activeLimit.y, mouseY));

    targetX += (mouseX + gyroX - targetX) * 0.02;
    targetY += (mouseY + gyroY - targetY) * 0.02;

    if (header) {
      header.style.transform = `translate(-50%,-50%) perspective(1000px) rotateX(${-targetY * 20}deg) rotateY(${targetX * 20}deg)`;
    }

    const lookTarget = new THREE.Vector3(targetX * 10, -targetY * 10, -20);
    camera.lookAt(lookTarget);

    videos.forEach((group) => {
      if (group.children[0].material.uniforms.time) {
        group.children[0].material.uniforms.time.value =
          performance.now() * 0.001;
      }
    });
  }

  renderer.render(scene, camera);
}

// Jalankan loop
gsap.ticker.add(animate);

// Archives
const archiveToggles = document.querySelectorAll(".btn-list");
const archiveClose = document.querySelector(".btn-globe");
const archives = document.querySelector(".archives");
const siteWrapper = document.querySelector(".site-wrapper");
const archiveWrapper = document.querySelector(".archive-wrapper");

// ====== ARCHIVES LOGIC (FIXED) ======
let archiveLenis = null; // Biarkan ini global

function initArchiveLenis() {
  // Cek dulu apakah elemennya ada, kalau gak ada jangan dipaksa jalan
  if (!archives || !archiveWrapper) return;

  if (archiveLenis) archiveLenis.destroy();

  archiveLenis = new Lenis({
    wrapper: archives,
    content: archiveWrapper,
    duration: 1.2, // Gue saranin turunin ke 1.2 biar gak terlalu floaty
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    lerp: 0.1,
    wheelMultiplier: 1,
    smoothWheel: true,
    smoothTouch: true,
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

// Pastikan loop click handler-nya bener
archiveToggles.forEach((toggle) => {
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    archivesOpen = true;
    globeGroup.visible = false;
    distortionGroup.visible = true;

    // --- TAMBAHAN: MATIKAN INTERAKSI LORONG ---
    // Pastikan container utama lorong (atau canvas) tidak menerima hover/klik
    document.querySelector(".main").style.pointerEvents = "none";
    // Jika slider lo butuh interaksi, pastikan dia nyala
    document.querySelector(".slider").style.pointerEvents = "auto";

    gsap.to(camera.position, { z: 5, duration: 1 });
    currentlyHovered = null; // Reset hover lorong biar gak nyangkut

    if (archiveLenis) archiveLenis.scrollTo(0, { immediate: true });
    document.body.style.overflow = "hidden";
    initArchiveLenis();

    // Re-prepare SplitType
    if (titleSplit) titleSplit.revert();
    if (countSplit) countSplit.revert();
    titleSplit = new SplitType(titleElement, {
      types: "lines",
      lineClass: "line",
    });
    countSplit = new SplitType(counterElement, {
      types: "lines",
      lineClass: "line",
    });

    [titleSplit, countSplit].forEach((st) => {
      if (st.lines) {
        st.lines.forEach((line) => {
          line.innerHTML = `<div style="overflow:hidden; display:block;">${line.innerHTML}</div>`;
        });
      }
    });

    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
    tl.to(".header h1 .line", {
      yPercent: -500,
      duration: 0.6,
      stagger: 0.02,
    }).fromTo(
      [titleSplit.lines, countSplit.lines],
      { yPercent: 100 },
      { yPercent: 0, duration: 0.8, stagger: 0.05 },
      "-=0.4",
    );
  });
});

archiveClose.addEventListener("click", () => {
  archivesOpen = false;
  globeGroup.visible = true;
  distortionGroup.visible = false;

  // Kembalikan interaksi
  document.querySelector(".main").style.pointerEvents = "auto";
  document.querySelector(".slider").style.pointerEvents = "none";
  document.body.style.cursor = "default"; // RESET Kursor ke default

  // --- REVISI DI SINI ---
  // Ambil config LENGKAP (Z dan FOV) berdasarkan kondisi layar terbaru
  const targetCam = isMobile ? CAM_CONFIG.mobile : CAM_CONFIG.desktop;

  // 1. Animasi posisi Z (Pake targetCam.z yang dinamis)
  gsap.to(camera.position, {
    z: targetCam.z,
    duration: 1,
    ease: "power3.inOut",
  });

  // 2. Update FOV (Ini yang bikin POV lo gak ancur pas balik dari F11)
  gsap.to(camera, {
    fov: targetCam.fov,
    duration: 1,
    ease: "power3.inOut",
    onUpdate: () => camera.updateProjectionMatrix(), // Update matrix tiap frame animasi
  });

  // --- SISA KODE ANIMASI TEXT LO (SUDAH BENER) ---
  const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });

  tl.to([titleSplit.lines, countSplit.lines], {
    yPercent: 100,
    duration: 0.6,
    stagger: 0.02,
  }).to(
    ".header h1 .line",
    {
      yPercent: 0,
      duration: 0.8,
      stagger: 0.05,
    },
    "-=0.4",
  );

  if (archiveLenis) {
    archiveLenis.scrollTo(0, { immediate: true });
  }
});

// Scroll Distortion
const canvas = document.querySelector("canvas");
const titleElement = document.querySelector("p#slide-title");
const counterElement = document.querySelector("p#slide-count");

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// scene.background = new THREE.Color(0xffffff);

const wrap = (value, range) => ((value % range) + range) % range;

const zeroPad = (n) => String(n).padStart(2, "0");
const totalSlides = slides.length;
const slideHeights = Array.from(
  { length: totalSlides },
  () =>
    config.minHeight + Math.random() * (config.maxHeight - config.minHeight),
);

const slideOffsets = [];
let stackPosition = 0;

for (let i = 0; i < totalSlides; i++) {
  if (i === 0) {
    slideOffsets.push(0);
    stackPosition = slideHeights[0] / 2;
  } else {
    stackPosition += config.gap + slideHeights[i] / 2;
    slideOffsets.push(stackPosition);
    stackPosition += slideHeights[i] / 2;
  }
}

const loopLength = stackPosition + config.gap + slideHeights[0] / 2;
const halfLoop = loopLength / 2;

const meshes = [];
// Ganti textureLoader menjadi fungsi pembuat video
const createVideoTexture = (src) => {
  const video = document.createElement("video");
  video.src = src;
  video.loop = true;
  video.muted = true;
  video.playsInline = true; // Penting untuk mobile
  video.crossOrigin = "anonymous";
  video.play().catch(() => {
    console.log("Autoplay dicegah browser, perlu interaksi user");
  });

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { texture, video };
};

for (let i = 0; i < totalSlides; i++) {
  const height = slideHeights[i];
  const width = height * config.aspectRatio;

  // 1. Pakai ShaderMaterial atau MeshBasicMaterial
  const geometry = new THREE.PlaneGeometry(width, height, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // 2. Buat Video Texture
  const { texture, video } = createVideoTexture(slides[i].img);
  material.map = texture;

  mesh.userData = {
    originalVertices: [...geometry.attributes.position.array],
    offset: slideOffsets[i],
    name: slides[i].name,
    index: i,
    video: video, // Simpan referensi video jika nanti mau pause/play manual
  };

  // 3. Handling Aspect Ratio Video (Sama seperti logika img tadi)
  video.addEventListener("loadedmetadata", () => {
    const videoAspect = video.videoWidth / video.videoHeight;
    const planeAspect = width / height;
    const ratio = videoAspect / planeAspect;

    if (ratio > 1) mesh.scale.y = 1 / ratio;
    else mesh.scale.x = ratio;
  });

  distortionGroup.add(mesh);
  meshes.push(mesh);
}

function applyDistortion(mesh, positionY, strength) {
  const positions = mesh.geometry.attributes.position;
  const original = mesh.userData.originalVertices;

  for (let i = 0; i < positions.count; i++) {
    const x = original[i * 3];
    const y = original[i * 3 + 1];

    const distance = Math.sqrt(x * x + (positionY + y) ** 2);
    const falloff = Math.max(0, 1 - distance / 2);
    const bend = Math.pow(Math.sin((falloff * Math.PI) / 2), 1.5);
    positions.setZ(i, bend * strength);
  }

  positions.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

let scrollPosition = 0;
let scrollTarget = 0;
let scrollMomentum = 0;
let isScrolling = false;
let lastFrameTime = 0;

let distortionAmount = 0;
let distortionTarget = 0;
let velocityPeak = 0;
let scrollDirection = 0;
let directionTarget = 0;
const velocityHistory = [0, 0, 0, 0, 0];

let dragStartY = 0;
let dragDelta = 0;
let touchStartY = 0;
let touchLastY = 0;

let activeSlideIndex = -1;

const addDistortionBurst = (amount) => {
  distortionTarget = Math.min(1, distortionTarget + amount);
};

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const clampedDelta =
      Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), config.wheelMax);

    addDistortionBurst(Math.abs(clampedDelta) * 0.001);
    scrollTarget += clampedDelta * config.wheelSpeed;
    isScrolling = true;

    clearTimeout(window._scrollTimeout);
    window._scrollTimeout = setTimeout(() => (isScrolling = false), 150);
  },
  { passive: false },
);

window.addEventListener(
  "touchstart",
  (e) => {
    touchStartY = touchLastY = e.touches[0].clientY;
    isScrolling = false;
    scrollMomentum = 0;
  },
  { passive: false },
);

window.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();

    const deltaY = e.touches[0].clientY - touchLastY;
    touchLastY = e.touches[0].clientY;

    addDistortionBurst(Math.abs(deltaY) * 0.02);
    scrollTarget -= deltaY * config.touchSpeed;
    isScrolling = true;
  },
  { passive: false },
);

window.addEventListener("touchend", () => {
  const swipeVelocity = (touchLastY - touchStartY) * 0.005;

  if (Math.abs(swipeVelocity) > 0.5) {
    scrollMomentum = -swipeVelocity * config.touchMomentum;
    addDistortionBurst(Math.abs(swipeVelocity) * 0.45);
    isScrolling = true;
    setTimeout(() => (isScrolling = false), 800);
  }
});

// Set awal saat masuk dunia distortion (bisa ditaruh di archiveToggles)
document.body.style.cursor = "grab";

window.addEventListener("mousedown", (e) => {
  if (!archivesOpen) return;
  isDragging = true;
  dragStartY = e.clientY;
  dragDelta = 0;
  scrollMomentum = 0;

  // Ganti canvas.style.cursor jadi ini:
  document.body.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging || !archivesOpen) return;

  const deltaY = e.clientY - dragStartY;
  dragStartY = e.clientY;
  dragDelta = deltaY;

  if (typeof addDistortionBurst === "function") {
    addDistortionBurst(Math.abs(deltaY) * 0.02);
  }
  scrollTarget -= deltaY * config.dragSpeed;
  isScrolling = true;
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;

  isDragging = false;

  // Kembalikan ke grab jika masih di dunia archive
  if (archivesOpen) {
    document.body.style.cursor = "grab";
  }

  if (Math.abs(dragDelta) > 2) {
    scrollMomentum = -dragDelta * config.dragMomentum;
    if (typeof addDistortionBurst === "function") {
      addDistortionBurst(Math.abs(dragDelta) * 0.005);
    }
    isScrolling = true;
    setTimeout(() => {
      isScrolling = false;
    }, 800);
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
