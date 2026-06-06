import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import Lenis from "https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm";

// Registrasi plugin GSAP (Wajib jika pakai ScrollTrigger)
gsap.registerPlugin(ScrollTrigger);

// --- CONFIGURATIONS ---
const imageContainer = document.getElementById("imageContainer");
const imageElement = document.getElementById("myImage");
const asciiContainer = document.querySelector(".ascii-img");

// ASCII Config (B) - Versi Padat
const ASCII_CHARS = ".:+*#%@0369"; //
const denseCharIndex = 0; // Karena kita ingin hampir semuanya tebal
const denseChars = ["@", "#", "%", "8", ".", ":", "*"]; // Karakter untuk efek scramble
const FONT_SIZE = 6;
const ASPECT_WIDTH = 16;
const ASPEC_HEIGHT = 9;
let ASCII_COLUMNS = 200; // Sesuaikan kerapatan
let SCRAMBLE_COUNT = 8;
const SCRAMBLE_SPEED_MS = 60;
const CELL_APPEAR_MS = 1;
let isAnimating = false;
let animationId = null;
let charWidth, charHeight, ASCII_ROWS;
let PUSH_RADIUS = 10;
const PUSH_FORCE = 0.5;
const SPRING = 0.075;
const DAMPING = 0.6;
let mouse = { col: -999, row: -999, isMoving: false };

// Shader Config (A)
let easeFactor = 0.02;
let scene, camera, renderer, planeMesh;
let mousePosition = { x: 0.5, y: 0.5 };
let targetMousePosition = { x: 0.5, y: 0.5 };
let mouseStopTimeout;
let aberrationIntensity = 0.0;
let lastPosition = { x: 0.5, y: 0.5 };
let prevPosition = { x: 0.5, y: 0.5 };

// shaders
const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D u_texture;    
    uniform vec2 u_mouse;
    uniform vec2 u_prevMouse;
    uniform float u_aberrationIntensity;

    void main() {
        vec2 gridUV = floor(vUv * vec2(60.0, 60.0)) / vec2(60.0, 60.0);
        vec2 centerOfPixel = gridUV + vec2(1.0/60.0, 1.0/60.0);
        
        vec2 mouseDirection = u_mouse - u_prevMouse;
        
        vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
        float pixelDistanceToMouse = length(pixelToMouseDirection);
        float strength = smoothstep(0.3, 0.0, pixelDistanceToMouse);
 
        vec2 uvOffset = strength * - mouseDirection * 0.2;
        vec2 uv = vUv - uvOffset;

        vec4 colorR = texture2D(u_texture, uv + vec2(strength * u_aberrationIntensity * 0.01, 0.0));
        vec4 colorG = texture2D(u_texture, uv);
        vec4 colorB = texture2D(u_texture, uv - vec2(strength * u_aberrationIntensity * 0.01, 0.0));

        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
    }
`;

function initializeScene(texture) {
  //   scene creation
  scene = new THREE.Scene();

  // camera setup
  camera = new THREE.PerspectiveCamera(
    50,
    imageElement.offsetWidth / imageElement.offsetHeight,
    0.01,
    10,
  );
  camera.position.z = 1;

  //   uniforms
  let shaderUniforms = {
    u_mouse: { type: "v2", value: new THREE.Vector2() },
    u_prevMouse: { type: "v2", value: new THREE.Vector2() },
    u_aberrationIntensity: { type: "f", value: 0.0 },
    u_texture: { type: "t", value: texture },
    u_res: {
      type: "v2",
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    }, // Tambahkan ini
  };

  //   creating a plane mesh with materials
  planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1),
    new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      vertexShader,
      fragmentShader,
    }),
  );

  // >>> taruh fungsi scale di sini
  function updatePlaneScale() {
    // Tambahkan check ini agar tidak error di mobile
    if (!planeMesh) return;

    if (window.innerWidth <= 576) {
      planeMesh.scale.set(0.7, 0.7, 1);
    } else if (window.innerWidth <= 1200) {
      planeMesh.scale.set(0.9, 0.9, 1);
    } else {
      planeMesh.scale.set(1, 1, 1);
    }
    planeMesh.position.set(0, 0, 0);
  }

  // panggil pas init
  updatePlaneScale();

  // listener resize
  window.addEventListener("resize", () => {
    updatePlaneScale();

    camera.aspect = imageElement.offsetWidth / imageElement.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(imageElement.offsetWidth, imageElement.offsetHeight);
  });

  //   add mesh to scene
  scene.add(planeMesh);

  //   render
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(imageElement.offsetWidth, imageElement.offsetHeight);

  //   create a canvas
  imageContainer.appendChild(renderer.domElement);
}

// --- LOGIKA FLEKSIBEL DESKTOP/MOBILE ---
const isMobileDevice = window.innerWidth <= 768;

if (!isMobileDevice) {
  // DESKTOP: Jalankan Three.js
  initializeScene(new THREE.TextureLoader().load(imageElement.src));
  animateScene();
  // Sembunyikan gambar asli karena diganti WebGL
  imageElement.style.opacity = "0";
} else {
  // MOBILE: Three.js Mati
  if (renderer) {
    imageContainer.style.display = "none";
  }
  // Pastikan gambar asli MUNCUL
  imageElement.style.opacity = "1";
  imageElement.style.visibility = "visible";
  console.log("Mobile: Hero Image fallback active.");
}

function animateScene() {
  requestAnimationFrame(animateScene);

  mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
  mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

  planeMesh.material.uniforms.u_mouse.value.set(
    mousePosition.x,
    1.0 - mousePosition.y,
  );

  planeMesh.material.uniforms.u_prevMouse.value.set(
    prevPosition.x,
    1.0 - prevPosition.y,
  );

  aberrationIntensity = Math.max(0.0, aberrationIntensity - 0.05);

  planeMesh.material.uniforms.u_aberrationIntensity.value = aberrationIntensity;

  renderer.render(scene, camera);
}

// event listeners
imageContainer.addEventListener("mousemove", handleMouseMove);
imageContainer.addEventListener("mouseenter", handleMouseEnter);
imageContainer.addEventListener("mouseleave", handleMouseLeave);

function handleMouseMove(event) {
  easeFactor = 0.02;
  let rect = imageContainer.getBoundingClientRect();
  prevPosition = { ...targetMousePosition };

  targetMousePosition.x = (event.clientX - rect.left) / rect.width;
  targetMousePosition.y = (event.clientY - rect.top) / rect.height;

  aberrationIntensity = 1;
}

function handleMouseEnter(event) {
  easeFactor = 0.02;
  let rect = imageContainer.getBoundingClientRect();

  mousePosition.x = targetMousePosition.x =
    (event.clientX - rect.left) / rect.width;
  mousePosition.y = targetMousePosition.y =
    (event.clientY - rect.top) / rect.height;
}

function handleMouseLeave() {
  easeFactor = 0.05;
  targetMousePosition = { ...prevPosition };
}

// ASCII
// 1. Inisialisasi awal nilai grid
function updateGridDimensions() {
  const width = window.innerWidth;

  if (width <= 430) {
    // KHUSUS iPHONE / MOBILE KECIL
    ASCII_COLUMNS = 60;      // Kerapatan sedang agar detail gambar terjaga di layar sempit
    PUSH_RADIUS = 4;         // Radius interaksi lebih kecil agar tidak terlalu liar
    SCRAMBLE_COUNT = 3;      // Scramble lebih cepat
  } else if (width <= 768) {
    // MOBILE UMUM / TABLET
    ASCII_COLUMNS = 80;
    PUSH_RADIUS = 5;
    SCRAMBLE_COUNT = 4;
  } else {
    // DESKTOP
    ASCII_COLUMNS = 200;
    PUSH_RADIUS = 10;
    SCRAMBLE_COUNT = 8;
  }

  const measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = `${FONT_SIZE}px monospace`;
  charWidth = Math.ceil(measureCtx.measureText("M").width);
  charHeight = FONT_SIZE;

  // Gunakan offsetWidth dari container utama (.ascii-img) agar canvas sinkron
  const containerWidth = asciiContainer.offsetWidth;
  const containerHeight = asciiContainer.offsetHeight;

  const safeHeight = containerHeight || containerWidth * (9 / 16);

  // Kalkulasi baris tetap presisi terhadap aspek rasio container
  ASCII_ROWS = Math.round(
    ASCII_COLUMNS * (safeHeight / containerWidth) * (charWidth / charHeight)
  );
}

// Jalankan fungsi pertama kali
updateGridDimensions();

function startEffect(img, canvas, staggerDelay) {
  isAnimating = true;
  const { asciiGrid, brightnessGrid } = imageToAsciiGrid(img);
  prepareCanvas(canvas);
  animateCells(canvas, asciiGrid, brightnessGrid, staggerDelay);
}

function imageToAsciiGrid(img) {
  const samplingCanvas = document.createElement("canvas");
  samplingCanvas.width = ASCII_COLUMNS;
  samplingCanvas.height = ASCII_ROWS;
  const sCtx = samplingCanvas.getContext("2d", { willReadFrequently: true });

  const imageAspect = img.naturalWidth / img.naturalHeight;
  const rect = asciiContainer.getBoundingClientRect();
  const itemAspect = rect.width / rect.height;

  let cropX = 0,
    cropY = 0,
    cropW = img.naturalWidth,
    cropH = img.naturalHeight;
  if (imageAspect > itemAspect) {
    cropW = img.naturalHeight * itemAspect;
    cropX = (img.naturalWidth - cropW) / 2;
  } else {
    cropH = img.naturalWidth / itemAspect;
    cropY = (img.naturalHeight - cropH) / 2;
  }

  sCtx.drawImage(
    img,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    ASCII_COLUMNS,
    ASCII_ROWS,
  );
  const { data } = sCtx.getImageData(0, 0, ASCII_COLUMNS, ASCII_ROWS);

  const asciiGrid = [];
  const brightnessGrid = [];

  for (let i = 0; i < ASCII_COLUMNS * ASCII_ROWS; i++) {
    const idx = i * 4;
    const r = data[idx],
      g = data[idx + 1],
      b_val = data[idx + 2],
      a = data[idx + 3];

    // --- FIX DI SINI: Hitung Col dan Row dari index i ---
    const currentCol = i % ASCII_COLUMNS;
    const currentRow = Math.floor(i / ASCII_COLUMNS);

    if (a < 50) {
      asciiGrid.push({ char: " " }); // Tetap push object kosong biar index ga geser
      brightnessGrid.push(0);
    } else {
      let brightness = (r * 0.299 + g * 0.587 + b_val * 0.114) / 255;
      let char;
      if (brightness < 0.3) {
        const darkPool = [
          "@",
          "#",
          "%",
          "8",
          "0",
          "6",
          "3",
          "9",
          ".",
          ":",
          "*",
        ];
        char = darkPool[Math.floor(Math.random() * darkPool.length)];
      } else {
        char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
      }

      // Pakai currentCol dan currentRow yang sudah dihitung tadi
      asciiGrid.push({
        char: char,
        originalCol: currentCol,
        originalRow: currentRow,
        offsetX: 0,
        offsetY: 0,
        velX: 0,
        velY: 0,
        brightness: brightness,
      });
      brightnessGrid.push(brightness);
    }
  }
  return { asciiGrid, brightnessGrid };
}

function prepareCanvas(canvas) {
  let dpr = window.devicePixelRatio || 1;
  if (window.innerWidth <= 768) dpr = Math.min(dpr, 1.5);

  // Pakai offsetWidth/Height supaya lebih akurat nangkep ukuran box saat itu
  const width = asciiContainer.offsetWidth;
  const height = asciiContainer.offsetHeight;

  // Set resolusi internal (buffer)
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // Set ukuran display CSS sesuai pixel yang ditangkep (bukan %)
  // Ini biar GSAP tetep dapet koordinat pixel yang pasti, bukan relatif
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
}

function drawCharacter(ctx, x, y, char) {
  const rect = ctx.canvas.getBoundingClientRect();
  const cw = rect.width / ASCII_COLUMNS;
  const ch = rect.height / ASCII_ROWS;

  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, cw, ch);
  ctx.fillStyle = "#c8c8c8";
  ctx.fillText(char, x, y);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Tambahkan variabel ini di scope luar/global agar tidak kena reset
let lastGlobalScrambleTime = 0;

function animateCells(canvas, asciiGrid, brightnessGrid, staggerDelay) {
  const dpr = window.devicePixelRatio || 2;
  const ctx = canvas.getContext("2d", { alpha: false });
  const rect = canvas.getBoundingClientRect();
  const cellW = rect.width / ASCII_COLUMNS;
  const cellH = rect.height / ASCII_ROWS;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${cellH}px monospace`;
  ctx.textBaseline = "top";

  const totalCells = ASCII_COLUMNS * ASCII_ROWS;
  const cellStates = new Array(totalCells).fill(null);
  const startTime = performance.now() + staggerDelay;

  const cellOrder = shuffleArray(
    Array.from({ length: totalCells }, (_, i) => i),
  );

  function frame(timestamp) {
    if (!canvas.parentElement) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const elapsedSinceStart = timestamp - startTime;

    // --- 1. LOGIKA TIMING SCRAMBLE GLOBAL (KODE B) ---
    // Efek kedip setiap 50ms
    let shouldScrambleGlobal = timestamp - lastGlobalScrambleTime > 50;
    if (shouldScrambleGlobal) lastGlobalScrambleTime = timestamp;

    const batchSize = 25;
    let revealFinished = true;

    for (let i = 0; i < totalCells; i++) {
      const cellIndex = i;
      const cell = asciiGrid[cellIndex];

      if (cell.char === " ") continue;

      const orderIndex = cellOrder.indexOf(cellIndex);
      const appearTime = (orderIndex / batchSize) * CELL_APPEAR_MS;

      if (timestamp >= startTime && elapsedSinceStart >= appearTime) {
        if (cellStates[cellIndex] === null) {
          const isDark = brightnessGrid[cellIndex] > denseCharIndex;
          cellStates[cellIndex] = isDark ? SCRAMBLE_COUNT : 1;
        }

        if (cellStates[cellIndex] > 1) {
          revealFinished = false;
          // Scramble awal pas muncul
          if (
            Math.floor(timestamp / SCRAMBLE_SPEED_MS) !==
            Math.floor((timestamp - 16) / SCRAMBLE_SPEED_MS)
          ) {
            cell.displayChar =
              denseChars[Math.floor(Math.random() * denseChars.length)];
            cellStates[cellIndex]--;
          }
        } else {
          // --- 2. LOGIKA KEDIP-KEDIP KONSTAN (FIX NYA DISINI) ---
          // Jika sudah muncul semua, karakter tetap ganti-ganti tipis secara global
          if (shouldScrambleGlobal) {
            // Kita acak sedikit biar gak semua sel kedip barengan (biar lebih natural)
            if (Math.random() > 0.85) {
              cell.displayChar =
                ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
            } else {
              cell.displayChar = cell.char;
            }
          }
          cellStates[cellIndex] = 0;
        }
      } else {
        revealFinished = false;
        continue;
      }

      // --- PHYSICS ---
      const dx = cell.originalCol + cell.offsetX - mouse.col;
      const dy = cell.originalRow + cell.offsetY - mouse.row;
      const distSq = dx * dx + dy * dy;
      const radiusSq = PUSH_RADIUS * PUSH_RADIUS;

      if (distSq < radiusSq && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / PUSH_RADIUS) * PUSH_FORCE;
        cell.velX += (dx / dist) * force;
        cell.velY += (dy / dist) * force;
      }

      cell.velX = (cell.velX - cell.offsetX * SPRING) * DAMPING;
      cell.velY = (cell.velY - cell.offsetY * SPRING) * DAMPING;
      cell.offsetX += cell.velX;
      cell.offsetY += cell.velY;

      // --- RENDER ---
      const posX = (cell.originalCol + cell.offsetX) * cellW;
      const posY = (cell.originalRow + cell.offsetY) * cellH;

      ctx.fillStyle = "#c8c8c8";
      ctx.fillText(cell.displayChar || cell.char, posX, posY);
    }

    if (revealFinished && !isAnimating) {
      scheduleImageReveal(canvas);
    }

    animationId = requestAnimationFrame(frame);
  }

  animationId = requestAnimationFrame(frame);
}

function reverseAnimateCells(canvas, asciiGrid, brightnessGrid) {
  const dpr = window.devicePixelRatio || 2;
  const ctx = canvas.getContext("2d", { alpha: false });
  const rect = canvas.getBoundingClientRect();
  const cellW = rect.width / ASCII_COLUMNS;
  const cellH = rect.height / ASCII_ROWS;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${cellH}px monospace`;
  ctx.textBaseline = "top";

  const totalCells = ASCII_COLUMNS * ASCII_ROWS;

  // Filter hanya index yang punya karakter (bukan spasi)
  const activeIndices = [];
  for (let i = 0; i < totalCells; i++) {
    if (asciiGrid[i] && asciiGrid[i].char !== " ") {
      activeIndices.push(i);
    }
  }

  const cellOrder = shuffleArray([...activeIndices]);
  const cellStates = {}; // Untuk simpan status scramble tiap index
  const startTime = performance.now();
  const batchSize = 15; // Naikin biar transisinya lebih cepet dikit

  function frame(timestamp) {
    if (!canvas.parentElement) return;

    // WAJIB CLEAR FRAME: Biar sisa physics gak ninggalin jejak (ghosting)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, rect.width, rect.height);

    let allDone = true;
    const elapsed = timestamp - startTime;

    // Kita loop berdasarkan semua sel yang harusnya tampil
    for (let i = 0; i < cellOrder.length; i++) {
      const idx = cellOrder[i];
      const cell = asciiGrid[idx];
      const appearTime = (i / batchSize) * CELL_APPEAR_MS;

      // Jika sel ini sudah masuk waktu "hilang" (reverse reveal)
      if (elapsed >= appearTime) {
        if (cellStates[idx] === undefined) cellStates[idx] = SCRAMBLE_COUNT;

        if (cellStates[idx] > 0) {
          allDone = false;

          // --- FIX: Gunakan posisi physics terakhir agar tidak "lompat" ---
          const posX = (cell.originalCol + cell.offsetX) * cellW;
          const posY = (cell.originalRow + cell.offsetY) * cellH;

          const char =
            denseChars[Math.floor(Math.random() * denseChars.length)];

          ctx.fillStyle = "#c8c8c8";
          ctx.fillText(char, posX, posY);
          cellStates[idx]--;
        }
        // Kalau cellStates[idx] sudah 0, dia gak digambar lagi (efek menghilang)
      } else {
        // Belum waktunya hilang, tetep gambar karakter aslinya + physics
        allDone = false;

        // Tetap jalankan simulasi physics tipis-tipis biar baliknya smooth ke tengah
        cell.velX = (cell.velX - cell.offsetX * SPRING) * DAMPING;
        cell.velY = (cell.velY - cell.offsetY * SPRING) * DAMPING;
        cell.offsetX += cell.velX;
        cell.offsetY += cell.velY;

        const posX = (cell.originalCol + cell.offsetX) * cellW;
        const posY = (cell.originalRow + cell.offsetY) * cellH;

        ctx.fillStyle = "#c8c8c8";
        ctx.fillText(cell.char, posX, posY);
      }
    }

    if (!allDone) {
      animationId = requestAnimationFrame(frame);
    } else {
      isAnimating = false;
      animationId = null;

      // 1. Sembunyikan container ASCII
      gsap.to(asciiContainer, { opacity: 0, duration: 0.3 });

      // 2. Logika Fallback: Pilih mana yang mau dimunculin
      if (!isMobileDevice) {
        // DESKTOP: Munculin Three.js (imageContainer)
        gsap.to(imageContainer, { opacity: 1, duration: 0.5 });
        // Pastikan imageElement tetep transparan di desktop agar tidak double
        imageElement.style.opacity = "1";
      } else {
        // MOBILE: Munculin gambar hero.webp asli (imageElement)
        gsap.to(imageElement, {
          opacity: 1,
          duration: 0.5,
          onStart: () => {
            imageElement.style.visibility = "visible";
          },
        });
      }

      // Matikan pointer events agar tidak menghalangi klik di bawahnya
      asciiContainer.style.pointerEvents = "none";
    }
  }
  animationId = requestAnimationFrame(frame);
}

function scheduleImageReveal(canvas) {
  const parent = canvas.closest(".ascii-img");
  if (parent) parent.classList.add("revealed");
}

asciiContainer.addEventListener("mousemove", (e) => {
  const rect = asciiContainer.getBoundingClientRect();
  const cellW = rect.width / ASCII_COLUMNS;
  const cellH = rect.height / ASCII_ROWS;

  mouse.col = (e.clientX - rect.left) / cellW;
  mouse.row = (e.clientY - rect.top) / cellH;
  mouse.isMoving = true;
});

asciiContainer.addEventListener("mouseleave", () => {
  mouse.col = -999;
  mouse.row = -999;
  mouse.isMoving = false;
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    updateGridDimensions();
    const canvas = asciiContainer.querySelector("canvas");
    if (canvas) {
      prepareCanvas(canvas);
      const opacity = window.getComputedStyle(asciiContainer).opacity;
      if (parseFloat(opacity) > 0) {
        const pngImg = asciiContainer.querySelector("img");
        startEffect(pngImg, canvas, 0);
      }
    }
  }, 250);
});

// --- TOGGLE LOGIC REVISI (HARD RESET) ---
const btnImg = document.querySelector(".btn-img");
const btnAscii = document.querySelector(".btn-ascii");
const btnActive = document.querySelector(".btn-active");

// Fungsi pembantu untuk membersihkan segalanya
function killAsciiAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  isAnimating = false;

  // Cari canvas dan hapus paksa
  const canvas = asciiContainer.querySelector("canvas");
  if (canvas) {
    canvas.remove();
  }

  // Hapus class revealed jika ada
  const parent = asciiContainer.closest(".ascii-img");
  if (parent) {
    parent.classList.remove("revealed");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnTexts = document.querySelectorAll(".btn-text");
  const btnActive = document.querySelector(".btn-active");
  const btnImg = document.querySelector(".btn-img");
  const btnAscii = document.querySelector(".btn-ascii");

  // --- 1. Fungsi Animasi Sliding Vertikal ---
  function moveActiveBox(element) {
    const rect = {
      height: element.offsetHeight,
      top: element.offsetTop,
    };

    // Animasi naik turun
    gsap.to(btnActive, {
      top: rect.top,
      height: rect.height,
      duration: 0.5,
      ease: "power3.inOut",
    });

    // Update warna teks
    btnTexts.forEach((btn) => btn.classList.remove("active-text"));
    element.classList.add("active-text");
  }

  // Set posisi awal (Img)
  if (btnImg) {
    gsap.set(btnActive, {
      top: btnImg.offsetTop,
      height: btnImg.offsetHeight,
    });
  }

  // --- 2. Logic Event ASCII (Integrasi) ---

  btnAscii.addEventListener("click", () => {
    if (isAnimating) return;

    moveActiveBox(btnAscii);
    killAsciiAnimation();

    // Sembunyikan KEDUANYA (Three.js dan Gambar Asli)
    gsap.to(imageContainer, { opacity: 0, duration: 0.5 });
    gsap.to(imageElement, { opacity: 0, duration: 0.5 }); // Tambahkan ini

    gsap.to(asciiContainer, {
      opacity: 1,
      pointerEvents: "auto",
      duration: 0.3,
      onComplete: () => {
        const pngImg = asciiContainer.querySelector("img");
        const canvas = document.createElement("canvas");
        asciiContainer.appendChild(canvas);
        startEffect(pngImg, canvas, 0);
      },
    });
  });

  btnImg.addEventListener("click", () => {
    // Re-check lebar layar tepat saat klik
    const currentIsMobile = window.innerWidth <= 768;
    
    const isAsciiVisible = parseFloat(window.getComputedStyle(asciiContainer).opacity) > 0;
    if (!isAsciiVisible) return; 

    moveActiveBox(btnImg);

    const canvas = asciiContainer.querySelector("canvas");
    const pngImg = asciiContainer.querySelector("img");

    if (currentIsMobile) {
      killAsciiAnimation(); 
      
      // 1. Matikan ASCII segera
      gsap.to(asciiContainer, { 
        opacity: 0, 
        duration: 0.3, 
        onComplete: () => {
          asciiContainer.style.pointerEvents = "none";
        }
      });
      
      // 2. PAKSA Hero Image muncul (Gunakan set untuk reset instan sebelum animasi)
      gsap.set([imageElement, imageContainer], { 
        display: "block", 
        visibility: "visible", 
        opacity: 0 // Start dari 0 untuk fade in
      });

      gsap.to(imageElement, { 
        opacity: 1, 
        duration: 0.5,
        clearProps: "all",
      });

      gsap.to(imageContainer, { 
        opacity: 1, 
        duration: 1,
        clearProps: "all",
      });
      
      return; 
    }

    // --- LOGIKA DESKTOP TETAP SAMA ---
    if (canvas && pngImg) {
      isAnimating = true; 
      const { asciiGrid, brightnessGrid } = imageToAsciiGrid(pngImg);
      asciiContainer.style.pointerEvents = "none";
      reverseAnimateCells(canvas, asciiGrid, brightnessGrid);
    } else {
      killAsciiAnimation();
      gsap.to(asciiContainer, { opacity: 0, duration: 0.5 });
      gsap.to(imageContainer, { opacity: 1, duration: 0.5 });
    }
  });
});

// About
const btn = document.querySelector(".info-btn");
const infoBg = document.querySelector(".info-bg");
const close = document.querySelector(".info-close");

const menu = {
  element: document.querySelector(".infos"),
  wrapper: document.querySelector(".info-wrapper"),
  background: document.querySelector(".info-background"),
  separator: document.querySelector(".info-separator"),
};

const setting = {
  duration: 0.8,
  ease: "expo.inOut",
  delay: "-=80%",
};

const tlMenu = gsap.timeline({
  paused: true,
  defaults: { duration: setting.duration, ease: setting.ease },
});

const isMobile = window.innerWidth < 1921;

const animateMenu = () => {
  gsap.set(menu.element, { pointerEvents: "none" });
  gsap.set(menu.wrapper, { autoAlpha: 0 });

  !isMobile
    ? gsap.set(menu.background, { scaleY: 0, scaleX: 0.002 })
    : gsap.set(menu.background, { scaleX: 0, scaleY: 0.002 });

  !isMobile
    ? gsap.set(menu.separator, { height: 0 })
    : gsap.set(menu.separator, { width: 0 });

  // Menu background timeline animation
  tlMenu.to(infoBg, {
    backdropFilter: "blur(30px)",
    duration: setting.duration,
  });

  !isMobile
    ? tlMenu
        .to(menu.background, {
          duration: setting.duration / 2,
          scaleY: "100%",
        })
        .to(menu.background, { scaleX: 1 })
    : tlMenu
        .to(menu.background, {
          duration: setting.duration / 2,
          scaleX: "100%",
        })
        .to(menu.background, { scaleY: 1 });

  // Menu container animation
  tlMenu
    .to(menu.element, { pointerEvents: "auto" }, setting.delay)
    .to(menu.wrapper, { autoAlpha: 1 }, setting.delay);

  // Menu separator
  !isMobile
    ? tlMenu.to(menu.separator, { height: "calc(100% - 4rem)" }, setting.delay)
    : tlMenu.to(menu.separator, { width: "calc(100% - 2rem)" }, setting.delay);
};

const addEventListeners = () => {
  btn.addEventListener("click", () => tlMenu.play());
  close.addEventListener("click", () => tlMenu.reverse(2));
};

addEventListeners();

window.onload = () => {
  animateMenu();
};

// Info toggle fullscreen scroll
const infoToggle = document.querySelector(".info-btn");
const infoClose = document.querySelector(".info-close");
const infos = document.querySelector(".info");

infoToggle.addEventListener("click", () => {
  // infos.classList.add("active");
  document.body.style.overflow = "hidden"; // Supaya body gak ikut scroll
  infosLenis.scrollTo(0, { immediate: true });
});

infoClose.addEventListener("click", () => {
  // infos.classList.remove("active");
  document.body.style.overflow = "auto"; // Normal lagi
});

const horizontal = document.querySelector(".horizontal");
const vertical = document.querySelector(".vertical");
const dot = document.querySelector(".dot");

// Inisialisasi awal agar posisi .dot bener-bener pas di tengah mouse dari awal
gsap.set(dot, { xPercent: -50, yPercent: -50 });

mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let pos = { x: mouse.x, y: mouse.y };

// Tambahkan variabel untuk menampung data rotasi dan kecepatannya
let currentRotation = 0;
let mouseVelocity = 0;

window.addEventListener("mousemove", (e) => {
  // Hitung seberapa cepat mouse bergerak (jarak antara posisi mouse baru dan posisi mouse sebelumnya)
  const dx = e.clientX - mouse.x;
  const dy = e.clientY - mouse.y;
  
  // Rumus pythagoras untuk dapat total jarak perpindahan dalam 1 frame
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Set velocity berdasarkan jarak perpindahan mouse (kalau gerak cepat, putaran makin kencang)
  // Lo bisa kalikan dengan angka tertentu (misal * 0.5 atau * 1.5) untuk atur sensitivitas kecepatan putarnya
  mouseVelocity = distance * 7.5; 

  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

gsap.ticker.add(() => {
  // Easing untuk pergerakan posisi (bawaan kode lo)
  pos.x += (mouse.x - pos.x) * 0.075;
  pos.y += (mouse.y - pos.y) * 0.075;

  // Efek Easing untuk Rotasi: perlahan kurangi velocity agar kalau mouse berhenti, putaran melambat smooth
  mouseVelocity += (0 - mouseVelocity) * 0.04; 

  // Tambahkan velocity saat ini ke rotasi kumulatif si .dot
  currentRotation += mouseVelocity;

  // Terapkan ke elemen HTML lewat GSAP
  gsap.set(horizontal, { top: pos.y });
  gsap.set(vertical, { left: pos.x });
  
  // Update posisi sekaligus rotasi terbarunya
  gsap.set(dot, { 
    x: pos.x, 
    y: pos.y, 
    rotation: currentRotation 
  });
});

// 1. Lenis Utama untuk Body (Meski 100vh, tetap biarkan ada)
const mainLenis = new Lenis();

// 2. Lenis Khusus untuk Modal .infos
const infosLenis = new Lenis({
  wrapper: document.querySelector(".infos"), // Container yang punya overflow
  content: document.querySelector(".info-wrapper"), // Konten di dalamnya
  duration: 1.5, // Durasi scroll (dalam detik). Makin besar makin lambat/smooth
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function (Premium feel)
  orientation: "vertical",
  gestureOrientation: "vertical",
  smoothWheel: true,
  wheelMultiplier: 1, // Bisa kamu naikkan ke 1.2 kalau merasa terlalu berat
  infinite: false,
});

// Jalankan keduanya dalam satu RAF loop
function raf(time) {
  // Jika mainLenis masih dipakai di body, jalankan juga
  if (typeof mainLenis !== "undefined") mainLenis.raf(time);

  infosLenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

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

window.dispatchEvent(new Event("threejsReady"));
