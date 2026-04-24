import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/meshoptimizer@0.18.1/meshopt_decoder.module.js";
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm';
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';

// --- INITIALIZATION ---
gsap.registerPlugin(ScrollTrigger);

// --- INITIALIZATION ---
const lenis = new Lenis({
  content: document.querySelector('#scroll-content'), // Kasih tahu konten utamanya
  infinite: true,
  smoothWheel: true,
  smoothTouch: true, 
  touchMultiplier: 1.5,
  lerp: 0.1,
});

// Refresh hitungan setiap kali ada perubahan DOM (Cloning)
function refreshLenis() {
  lenis.resize();
  ScrollTrigger.refresh();
}

// Sync dengan ScrollTrigger
lenis.on("scroll", ScrollTrigger.update);

// Pastikan ticker jalan terus
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// --- RESPONSIVE CONFIG ---
let responsiveConfig = {
  modelScale: 0.75,
  maxGap: 14,
  startPos: "center 70%",
  endPos: "center 30%"
};

function updateResponsiveConfig() {
  const width = window.innerWidth;
  // Gunakan referensi base width (misal 1920 untuk desktop)
  const baseWidth = 1920; 
  
  if (width < 576) {
    responsiveConfig.modelScale = 0.25;
    responsiveConfig.maxGap = 6;
    responsiveConfig.startPos = "center 60%";
    responsiveConfig.endPos = "center 40%";
  } else if (width < 768) {
    responsiveConfig.modelScale = 0.3;
    responsiveConfig.maxGap = 8;
    responsiveConfig.startPos = "center 60%";
    responsiveConfig.endPos = "center 40%";
  } else if (width < 1200) {
    responsiveConfig.modelScale = 0.4; // Sedikit disesuaikan
    responsiveConfig.maxGap = 12;
    responsiveConfig.startPos = "center 60%";
    responsiveConfig.endPos = "center 40%";
  } else {
    // Untuk desktop, kita kunci skalanya agar tidak meledak saat fullscreen
    // Kita kalikan dengan rasio lebar saat ini dibanding lebar standar
    const desktopBaseScale = 0.75;
    responsiveConfig.modelScale = desktopBaseScale; 
    responsiveConfig.maxGap = 16;
    responsiveConfig.startPos = "center 70%";
    responsiveConfig.endPos = "center 30%";
  }
}

// Jalankan pertama kali
updateResponsiveConfig();

// --- GSAP & SCROLL LOGIC ---
const contactInfo = document.querySelector(".contact-info");
const parent = contactInfo.parentElement;

const isMobile = window.innerWidth < 768;
const cloneCount = isMobile ? 12 : 6; 

for (let i = 0; i < cloneCount; i++) {
  const clone = contactInfo.cloneNode(true);
  parent.appendChild(clone);
}

for (let i = 0; i < 4; i++) {
  const clone = contactInfo.cloneNode(true);
  parent.prepend(clone);
}

// CRITICAL: Kasih jeda dikit biar browser selesai render clone sebelum dihitung Lenis
setTimeout(() => {
  window.scrollTo(0, window.innerHeight);
  refreshLenis();
}, 100);

// 2. AMBIL SEMUA ROW SETELAH CLONING SELESAI
// Pakai querySelectorAll DI SINI, jangan di atas
const contactRows = document.querySelectorAll(".contact-info-row");

// 3. SET START POSITION
// Paksa scroll sedikit ke bawah supaya engine infinite punya "nafas" buat scroll up
window.scrollTo(0, window.innerHeight);

// 4. JALANKAN GSAP LOOP
contactRows.forEach((row) => {
  gsap.set(row, { opacity: 0.4, filter: "blur(2px)", gap: "1rem" });

  ScrollTrigger.create({
    trigger: row,
    start: () => responsiveConfig.startPos,
    end: () => responsiveConfig.endPos,
    scrub: true,
    onUpdate: (self) => {
      const curve = Math.sin(self.progress * Math.PI);
      const gap = 1 + (responsiveConfig.maxGap - 1) * curve;
      row.style.gap = `${gap}rem`;

      const sharpCurve = Math.pow(curve, 4);
      row.style.opacity = 0.4 + 0.6 * sharpCurve;
      row.style.filter = `blur(${(1 - sharpCurve) * 3}px)`;
    },
    onLeave: () => gsap.set(row, { opacity: 0.4, filter: "blur(2px)", gap: "1rem" }),
    onLeaveBack: () => gsap.set(row, { opacity: 0.4, filter: "blur(2px)", gap: "1rem" }),
  });
});

// Refresh total
ScrollTrigger.refresh();

// --- MODEL SWITCHING LOGIC ---
let lastCenteredRow = null;
let currentModelIndex = 0;
let isSwitching = false;

lenis.on("scroll", () => {
  if (isSwitching) return;
  const viewportCenter = window.innerHeight / 2;
  let closestRow = null;
  let minDistance = Infinity;

  contactRows.forEach((row) => {
    const rect = row.getBoundingClientRect();
    const rowMid = rect.top + rect.height / 2;
    const distance = Math.abs(rowMid - viewportCenter);

    if (distance < minDistance && distance < 15) {
      minDistance = distance;
      closestRow = row;
    }
  });

  if (closestRow && closestRow !== lastCenteredRow) {
    lastCenteredRow = closestRow;

    // Ganti Model di balik Glitch
    const nextIndex = (currentModelIndex + 1) % 7;

    models.forEach((m, idx) => {
      if (m) m.visible = idx === nextIndex;
    });

    currentModelIndex = nextIndex;
  }
});

// --- UTILITIES (Clock & Links) ---
function updateClock() {
  const timeElements = document.querySelectorAll(".current-time");
  const now = new Date();
  const timeString = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  timeElements.forEach((el) => (el.textContent = `${timeString} (WIB)`));
}
setInterval(updateClock, 1000);
updateClock();

// --- THREE.JS SETUP ---
let scene, camera, renderer; // Composer & glitchPass dihapus dulu
let models = [];
let mouse = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };

function initThree() {
  const container = document.querySelector(".contact-visual");

  // Bersihkan container dari canvas lama (kalau ada)
  container.innerHTML = "";

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true, // Membantu beberapa browser render alpha lebih baik
  });

  // Set background canvas benar-benar transparan
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  loadModels();
  animate();
}

function loadModels() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  for (let i = 1; i <= 7; i++) {
    loader.load(
      `./models/${i}/scene-opt.glb`,
      (gltf) => {
        const model = gltf.scene;

        // 1. RESET ORIENTASI & SCALE BAWAAN
        model.updateMatrixWorld();

        // 2. HITUNG BOX SETELAH RESET
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);

        // --- PENGGUNAAN CONFIG RESPONSIVE ---
        // Menggunakan responsiveConfig.modelScale yang sudah diupdate di window resize
        const scaleFactor = responsiveConfig.modelScale / maxDim;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // 3. TENGALKAN POSISI (Centering)
        model.position.x = -center.x * scaleFactor;
        model.position.y = -center.y * scaleFactor;
        model.position.z = -center.z * scaleFactor;

        // 4. BUNGKUS KE GROUP
        const wrapper = new THREE.Group();
        wrapper.add(model);

        // --- FINE TUNING MANUAL (Tetap proporsional terhadap scaleFactor) ---
        if (i === 1) {
          model.scale.multiplyScalar(1.1); 
        }
        if (i === 2) {
          model.scale.multiplyScalar(0.7);
        }
        if (i === 3) {
          model.scale.multiplyScalar(0.8);
        }
        if (i === 5) {
          model.scale.multiplyScalar(0.9);
        }
        if (i === 6) {
          model.scale.multiplyScalar(0.8);
        }
        if (i === 7) {
          model.scale.multiplyScalar(0.7); 
        }

        wrapper.visible = i === 1;
        scene.add(wrapper);
        models[i - 1] = wrapper;
      },
    );
  }
}

function animate() {
  // Kalau user pindah tab, jangan render apa-apa
  if (document.hidden) {
    requestAnimationFrame(animate);
    return;
  }

  requestAnimationFrame(animate);

  // Kalkulasi lerp rotation tetap di sini
  targetRotation.x += (mouse.y * 0.5 - targetRotation.x) * 0.05;
  targetRotation.y += (mouse.x * 0.5 - targetRotation.y) * 0.05;

  models.forEach((wrapper) => {
    if (wrapper && wrapper.visible) {
      wrapper.rotation.y = targetRotation.y;
      wrapper.rotation.x = targetRotation.x;
    }
  });

  renderer.render(scene, camera);
}

// Update posisi mouse biar modelnya gak diem atau "ilang" arah
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX / window.innerWidth - 0.5;
  mouse.y = e.clientY / window.innerHeight - 0.5;
});

// --- Resize Handler Update ---
window.addEventListener("resize", () => {
  updateResponsiveConfig();

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  models.forEach((wrapper, idx) => {
    if (wrapper) {
      const model = wrapper.children[0];
      
      // 1. Paksa update matrix biar kalkulasi box akurat
      model.updateMatrixWorld(true);
      
      // 2. Hitung Bounding Box sebelum kita ubah skalanya (asli)
      // Kita pakai helper box3
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // 3. Kembalikan ukuran ke dimensi asli (normalized)
      // Kita hitung maxDim asli sebelum kena scale sekarang
      const currentScale = model.scale.x; 
      const originalMaxDim = Math.max(size.x, size.y, size.z) / currentScale;
      
      // 4. Hitung Skala Baru
      let finalScale = responsiveConfig.modelScale / originalMaxDim;

      // Logic Fullscreen/Ultrawide lo
      if (width > 1600) {
          const factor = 1600 / width; 
          finalScale *= Math.max(factor, 0.85);
      }

      // 5. Terapkan Skala Baru & Multiplier Manual
      const multipliers = [1.1, 0.7, 0.8, 1, 0.9, 0.8, 0.7];
      const scaledFinal = finalScale * multipliers[idx];
      model.scale.setScalar(scaledFinal);

      // 6. UPDATE CENTERING (Ini kuncinya)
      // Kita hitung ulang center dari object aslinya 
      // lalu geser posisi model supaya pivot wrapper tetap di tengah model
      const newBox = new THREE.Box3().setFromObject(model);
      const newCenter = new THREE.Vector3();
      newBox.getCenter(newCenter);

      // Kita pindahkan model relatif terhadap wrapper
      // dikurangi newCenter saat ini agar dia balik ke (0,0,0) di mata wrapper
      model.position.x -= newCenter.x;
      model.position.y -= newCenter.y;
      model.position.z -= newCenter.z;
    }
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

initThree();

window.dispatchEvent(new Event("threejsReady"));
