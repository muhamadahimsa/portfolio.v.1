import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/meshoptimizer@0.18.1/meshopt_decoder.module.js";
import { RGBELoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/RGBELoader.js";
import { sliderData } from "./sliderData.js";

gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(CustomEase);

// ====== Scene & Camera ======
const container = document.getElementById("p5-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd0d0d0);

let width = window.innerWidth;
let height = window.innerHeight;

// Gunakan LoadingManager bawaan Three.js
const loadingManager = new THREE.LoadingManager();

loadingManager.onLoad = function () {
  // SEMUA MODEL & TEKSTUR SELESAI DI-LOAD
  // Kirim sinyal ke file transition.js
  window.dispatchEvent(new Event("threejsReady"));
};

// Pastikan saat load model, masukkan manager ini:
// const loader = new GLTFLoader(loadingManager);
// loader.load('model.gltf', ...);

// BACKUP: Jika di halaman tertentu tidak ada Three.js,
// pastikan sinyal tetap terkirim agar tirai tidak tertutup selamanya.
if (typeof THREE === "undefined") {
  window.dispatchEvent(new Event("threejsReady"));
}

// --- TAMBAHKAN KEMBALI BAGIAN INI ---
const camera = new THREE.OrthographicCamera(
  -width / 2,
  width / 2,
  height / 2,
  -height / 2,
  -5000,
  5000,
);
camera.position.z = 1500;
// ------------------------------------

const renderer = new THREE.WebGLRenderer({
  antialias: false, // Optimasi: Redam panas
  alpha: true,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(1); // Optimasi: Redam panas
renderer.setSize(width, height);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.7;
container.appendChild(renderer.domElement);

// ====== HDRI Environment ======
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
new RGBELoader(loadingManager)
  .setPath("hdri/")
  .load("studio_small_03_1k.hdr", (hdrTexture) => {
    const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    scene.environment = envMap;
    hdrTexture.dispose();
    pmremGenerator.dispose();
  });

// ====== Cannon World ======
// Ganti settingan world kamu dengan ini
const world = new CANNON.World();
world.gravity.set(0, 0, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = true;

// Buat material untuk semua benda
const defaultMaterial = new CANNON.Material("default");
const contactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.05, // Biar gak seret pas tabrakan
    restitution: 0.7, // EFEK BOUNCE (0 = mati, 1 = pantulan sempurna)
  },
);
world.addContactMaterial(contactMaterial);
world.defaultContactMaterial = contactMaterial;

// Turunkan iterasi dari 25 ke 10 agar CPU tidak bekerja 100% setiap frame
world.solver.iterations = 10;
world.solver.tolerance = 0.01; // Toleransi sedikit lebih longgar tapi tetap akurat

// ====== Boundaries ======
const boundaries = [];
const thickness = 50;
function addBoundaries() {
  boundaries.forEach((b) => world.removeBody(b));
  boundaries.length = 0;

  const halfW = width / 2;
  const halfH = height / 2;

  function addBox(px, py, sx, sy) {
    const body = new CANNON.Body({
      mass: 0,
      material: defaultMaterial,
      sleepSpeedLimit: 0.5,
      sleepTimeLimit: 0.5,
      linearDamping: 0.4, // Tambahkan ini (Rem buat gerak translasi)
      angularDamping: 0.4, // Tambahkan ini (Rem buat putaran)
    });
    body.addShape(new CANNON.Box(new CANNON.Vec3(sx, sy, 1000)));
    body.position.set(px, py, 0);
    body.quaternion.set(0, 0, 0, 1);
    world.addBody(body);
    boundaries.push(body);
  }

  addBox(0, -halfH - thickness / 2, halfW + thickness * 2, thickness / 2);
  addBox(0, halfH + thickness / 2, halfW + thickness * 2, thickness / 2);
  addBox(-halfW - thickness / 2, 0, thickness / 2, halfH + thickness * 2);
  addBox(halfW + thickness / 2, 0, thickness / 2, halfH + thickness * 2);
}
addBoundaries();

// ====== Style Presets (D = drift, H = hover, S = speed/feel) ======
// D1..D3: drift intensity / randomness
const DRIFT_PROFILES = {
  D1: { torqueStrength: 0.0005, driftStrength: 0.03, jitterInterval: 1200 }, // gentle
  D2: { torqueStrength: 0.008, driftStrength: 0.08, jitterInterval: 800 }, // curious
  D3: { torqueStrength: 0.02, driftStrength: 0.14, jitterInterval: 500 }, // lively
};
// Hover profiles H1..H3
const HOVER_PROFILES = {
  H1: { angularBoost: 1.08, impulseStrength: 0.6 }, // gentle
  H2: { angularBoost: 1.18, impulseStrength: 1.0 }, // playful
  H3: { angularBoost: 1.4, impulseStrength: 1.6 }, // reactive
};
// Speed/feel S1..S3: global damping & target base rotation
const SPEED_PROFILES = {
  S1: { linearDamping: 0.22, angularDamping: 0.45, baseAngularVel: 0.05 }, // Calm Luxury
  S2: { linearDamping: 0.18, angularDamping: 0.18, baseAngularVel: 0.22 }, // Smooth Alive
  S3: { linearDamping: 0.12, angularDamping: 0.28, baseAngularVel: 0.34 }, // Light Playful
};

// default selection (as decided): D1 + H1 + S1, rotation B (full 3-axis)
let currentDrift = "D1";
let currentHover = "H1";
let currentSpeed = "S1";

// helper to change style at runtime: setStyle(driftStr, hoverStr, speedStr)
function setStyle(driftStr, hoverStr, speedStr) {
  if (DRIFT_PROFILES[driftStr]) currentDrift = driftStr;
  if (HOVER_PROFILES[hoverStr]) currentHover = hoverStr;
  if (SPEED_PROFILES[speedStr]) currentSpeed = speedStr;
}
// example: setStyle("D2","H2","S2"); // you can call this from console

// ====== Load GLB Models ======
const loader = new GLTFLoader(loadingManager);
loader.setMeshoptDecoder(MeshoptDecoder);

const boxes = [];
const boxCount = 10;
const maxDisplaySize = 310;

// ====== CUSTOM SIZE SETTINGS per MODEL ======
// Atur angka sesuai keinginan untuk masing-masing model (1-10)
const MODEL_SETTINGS = {
  1: { desktop: 500, mobile: 150 },
  2: { desktop: 210, mobile: 140 },
  3: { desktop: 300, mobile: 180 },
  4: { desktop: 300, mobile: 150 },
  5: { desktop: 320, mobile: 160 },
  6: { desktop: 250, mobile: 130 },
  7: { desktop: 200, mobile: 165 },
  8: { desktop: 330, mobile: 155 },
  9: { desktop: 400, mobile: 145 },
  10: { desktop: 400, mobile: 170 },
};

// Helper untuk ambil ukuran berdasarkan breakpoint
function getTargetSize(modelId) {
  const isMobile = window.innerWidth <= 768;
  const config = MODEL_SETTINGS[modelId] || { desktop: 300, mobile: 150 }; // fallback
  return isMobile ? config.mobile : config.desktop;
}

for (let i = 1; i <= boxCount; i++) {
  loader.load(
    `/models/${i}/scene-opt.glb`,
    (gltf) => {
      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      wrapper.name = `model_${i}`;
      scene.add(wrapper);

      // 1. Ambil ukuran kustom untuk model ini
      const customDisplaySize = getTargetSize(i);

      // compute bbox and scale
      const bbox = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scaleFactor = customDisplaySize / maxDim;
      gltf.scene.scale.setScalar(scaleFactor);
      gltf.scene.position.sub(center.multiplyScalar(scaleFactor));

      const scaledSize = size.clone().multiplyScalar(scaleFactor);
      const minHalfZ = 8;
      const halfX = scaledSize.x / 2;
      const halfY = scaledSize.y / 2;
      const halfZ = Math.max(scaledSize.z / 2 || 0, minHalfZ);

      // recompute bounding spheres / disable frustum culling
      wrapper.traverse((m) => {
        if (m.isMesh) {
          if (m.geometry) {
            m.geometry.computeBoundingSphere();
            if (m.geometry.computeBoundingBox) m.geometry.computeBoundingBox();
          }
          m.frustumCulled = true;
        }
      });

      const shape = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));
      const body = new CANNON.Body({ mass: 1, material: defaultMaterial });
      body.addShape(shape);

      // physics: allow full 3D rotation but lock Z linear movement
      body.angularFactor.set(1, 1, 1); // full 3-axis rotation (B: rotate evenly)
      body.linearFactor.set(1, 1, 0); // no Z translation

      // spawn safely
      const minX = -width / 2 + halfX;
      const maxX = width / 2 - halfX;
      const minY = -height / 2 + halfY;
      const maxY = height / 2 - halfY;
      const randX = Math.random() * (maxX - minX) + minX;
      const randY = Math.random() * (maxY - minY) + minY;
      body.position.set(randX, randY, 1);

      world.addBody(body);
      wrapper.userData.body = body;
      wrapper.position.copy(body.position);

      // CARI DI DALAM loader.load, setelah baris: wrapper.position.copy(body.position);

      // TAMBAHKAN KODE INI:
      const hitBoxGeom = new THREE.BoxGeometry(
        scaledSize.x,
        scaledSize.y,
        scaledSize.z,
      );
      const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false }); // Invisible
      const hitBox = new THREE.Mesh(hitBoxGeom, hitBoxMat);
      wrapper.add(hitBox);
      wrapper.userData.hitBox = hitBox; // Simpan buat referensi raycast nanti

      // small random initial angular velocity for natural start
      body.angularVelocity.set(
        (Math.random() - 0.0) * 0.3,
        (Math.random() - 0.0) * 0.3,
        (Math.random() - 0.0) * 0.3,
      );

      body.angularVelocity.scale(0.0); // kurangi drastis

      // ensure torque vectors exist
      if (!body.torque) body.torque = new CANNON.Vec3();

      boxes.push({
        mesh: wrapper,
        body,
        size: scaledSize,
        halfX,
        halfY,
        halfZ,
      });
    },
    undefined,
    (err) => console.warn("Failed:", i, err),
  );
}

// ====== Lighting ======
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
dirLight.position.set(200, 300, 500);
scene.add(dirLight);

// ====== Raycaster & Hover Tracking ======
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoverTarget = null;

function traverseMeshes(obj, callback) {
  if (!obj) return;
  if (obj.isMesh) callback(obj);
  obj.children.forEach((c) => traverseMeshes(c, callback));
}

function findWrapperFromIntersect(intersect) {
  let obj = intersect.object;
  while (obj && !boxes.some((b) => b.mesh === obj)) {
    obj = obj.parent;
  }
  return boxes.find((b) => b.mesh === obj);
}

let interactionEnabled = true;
// Tambahkan variabel ini di atas event listener mousemove
let lastRaycastTime = 0;
const raycastInterval = 20; // Hanya cek raycast setiap 20ms (sekitar 50fps)

// GANTI SELURUH EVENT window.addEventListener("mousemove", ...) JADI INI:

window.addEventListener("mousemove", (e) => {
  if (!interactionEnabled) {
    hoverTarget = null;
    document.body.style.cursor = "default";
    return;
  }

  const now = performance.now();
  if (now - lastRaycastTime < raycastInterval) return;
  lastRaycastTime = now;

  mouse.x = (e.clientX / width) * 2 - 1;
  mouse.y = -(e.clientY / height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // OPTIMASI: Cukup cek hitBox, bukan ribuan poligon model asli
  const hitBoxes = boxes.map((b) => b.mesh.userData.hitBox).filter((hb) => hb);
  const intersects = raycaster.intersectObjects(hitBoxes);

  if (intersects.length > 0) {
    // Karena hitBox ada di dalam wrapper, kita cari wrapper-nya
    const clickedHitBox = intersects[0].object;
    hoverTarget = boxes.find((b) => b.mesh === clickedHitBox.parent);
  } else {
    hoverTarget = null;
    document.body.style.cursor = "default";
  }
});

// ====== Hover Behavior (H1..H3) ======
function performHoverEffect() {
  if (!hoverTarget) return;
  const h = HOVER_PROFILES[currentHover];
  const b = hoverTarget.body;

  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObject(hoverTarget.mesh, true)[0];
  if (!hit) return;

  const dir = new CANNON.Vec3(
    b.position.x - hit.point.x,
    b.position.y - hit.point.y,
    0,
  );
  const dist = dir.length();
  if (dist <= 0) return;

  dir.normalize();

  // ✔ Push-away Only (tanpa rotasi boost)
  const maxPush = Math.max(hoverTarget.halfX, hoverTarget.halfY) * 0.25;
  const strength = Math.min(maxPush, dist * maxPush * 1.0);

  const force = dir.scale(strength);

  // smooth impulse
  b.applyImpulse(force, b.position);

  // extra smoothing
  // b.angularVelocity.scale(0.997, b.angularVelocity);
}

// ====== Drift + Auto-rotation Logic (uses currentDrift + currentSpeed) ======
let lastJitter = performance.now();
function applyAutoMotion(body) {
  // const speed = SPEED_PROFILES[currentSpeed];
  // const base = speed.baseAngularVel;
  // // Cukup pastikan dia tetep muter pelan tanpa gaya baru tiap frame
  // body.angularVelocity.x += (base - body.angularVelocity.x) * 0.01;
  // body.angularVelocity.y += (base - body.angularVelocity.y) * 0.01;
  // body.angularVelocity.z += (base - body.angularVelocity.z) * 0.01;
}

// ====== Animate Loop ======
let lastTime = performance.now() / 1000;
// Tambahkan variabel saklar di atas fungsi animate
let isThreeJSVisible = true;

// CARI fungsi animate() lo, ubah isinya jadi begini:

function animate() {
  if (!isThreeJSVisible) {
    requestAnimationFrame(animate);
    return;
  }

  world.step(1 / 60);

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];

    // --- LOGIKA ANTI-GERAK (DIAM TOTAL) ---
    // Kalau objek ini BUKAN target yang lagi di-hover mouse, PAKSA TIDUR
    if (!hoverTarget || hoverTarget.body !== b.body) {
      b.body.sleep(); 
    } 
    // Kalau dia lagi di-hover, bangunin biar bisa gerak
    else {
      b.body.wakeUp();
    }
    // ---------------------------------------

    // Update posisi mesh cuma kalau dia bangun (biar hemat CPU)
    if (b.body.sleepState === CANNON.Body.AWAKE || (hoverTarget && hoverTarget.body === b.body)) {
      b.mesh.position.copy(b.body.position);
      b.mesh.quaternion.copy(b.body.quaternion);

      // Safety lock Z (Biar gak maju mundur ke kamera)
      b.body.position.z = 1;
      b.body.velocity.z = 0;
    }
    
    if (interactionEnabled && hoverTarget && hoverTarget.body === b.body) {
      performHoverEffect();
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// --- JEMBATAN ANTARA NAVIGASI DAN THREEJS ---
// Taruh ini di file ThreeJS kamu agar dia "mendengarkan" klik menu
window.addEventListener("navToggle", (e) => {
  const isNavOpen = e.detail.open;

  if (isNavOpen) {
    // Navigasi sedang terbuka -> PAKSA FROZEN
    isThreeJSVisible = false;
    interactionEnabled = false;
    if (container) container.style.pointerEvents = "none";
  } else {
    // Navigasi tertutup -> NYALAKAN LAGI (Hanya jika scroll di 0)
    if (window.scrollY === 0) {
      isThreeJSVisible = true;
      interactionEnabled = true;
      if (container) container.style.pointerEvents = "auto";
    }
  }
});

window.addEventListener(
  "scroll",
  () => {
    const scrollY = window.scrollY;
    if (scrollY > 0) {
      if (isThreeJSVisible) {
        isThreeJSVisible = false;
        interactionEnabled = false;
        if (container) container.style.pointerEvents = "none";
      }
    } else {
      if (!isThreeJSVisible && !window.isOpen) {
        isThreeJSVisible = true;
        interactionEnabled = true;
        if (container) container.style.pointerEvents = "auto";
      }
    }
  },
  { passive: true },
);

// ====== Resize ======
window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;

  renderer.setSize(width, height);
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();

  addBoundaries();
});

// ====== Expose style setter to global for quick runtime tweaking ======
window.setStyle = setStyle;

// Buat variabel pengecek agar tidak kirim double
// --- Sinyal Ready ---
let isReadySent = false;
function sendReadySignal(source) {
  if (isReadySent) return;
  isReadySent = true;
  window.dispatchEvent(new Event("threejsReady"));
}

loadingManager.onLoad = function () {
  // Tambahkan delay kecil 200ms agar posisi awal Cannon.js stabil dulu
  setTimeout(() => {
    sendReadySignal("Three.js Loader");
  }, 200);
};

// Fail-safe lokal
setTimeout(() => {
  sendReadySignal("Timeout Fail-safe");
}, 5000);

// --- LOGIKA MULTI-MAGNETIC BUTTONS ---
const allButtons = document.querySelectorAll(".--button");

allButtons.forEach((btnWrapper) => {
  // Kita cari elemen link/button dan teks di dalamnya
  const btn = btnWrapper.querySelector(".btn-wrapper");
  // Jika tidak ada span .btn-text, dia akan gerakkan isi button apa adanya
  const btnText = btn.querySelector(".btn-text") || btn;

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
