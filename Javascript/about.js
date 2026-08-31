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

const { Engine, Runner, World, Bodies, Body, Events } = Matter;
const engine = Engine.create({
  gravity: { x: 0, y: 0 },
});

const runner = Runner.create();
Runner.run(runner, engine);

const items = document.querySelectorAll(".item");

// Helper untuk reset inline style sementara agar bisa baca posisi asli CSS layout
function getOriginCSSPositions() {
  const savedStyles = Array.from(items).map((item) => ({
    top: item.style.top,
    left: item.style.left,
    transform: item.style.transform,
  }));

  // Clear style sementara
  items.forEach((item) => {
    item.style.top = "";
    item.style.left = "";
    item.style.transform = "";
  });

  // Ambil koordinat layout murni CSS
  const positions = Array.from(items).map((item) => {
    const rect = item.getBoundingClientRect();
    const containerRect = item.parentElement.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + item.offsetWidth / 2,
      y: rect.top - containerRect.top + item.offsetHeight / 2,
      width: item.offsetWidth,
      height: item.offsetHeight,
    };
  });

  // Kembalikan style fisika Matter.js
  items.forEach((item, index) => {
    item.style.top = savedStyles[index].top;
    item.style.left = savedStyles[index].left;
    item.style.transform = savedStyles[index].transform;
  });

  return positions;
}

// Inisialisasi Posisi Awal
let initialPositions = getOriginCSSPositions();

const bodies = Array.from(items).map((item, index) => {
  const pos = initialPositions[index];
  const body = Bodies.rectangle(pos.x, pos.y, pos.width, pos.height, {
    restitution: 0.75,
    friction: 0.5,
    frictionAir: 0.0175,
    isStatic: true,
  });
  World.add(engine.world, body);
  return body;
});

// Sync awal posisi elemen ke body Matter.js
bodies.forEach((body, index) => {
  const item = items[index];
  item.style.top = `${body.position.y}px`;
  item.style.left = `${body.position.x}px`;
  item.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
});

// Floor
let floor = Bodies.rectangle(
  window.innerWidth / 2,
  window.innerHeight + 10,
  window.innerWidth * 2,
  40,
  { isStatic: true }
);
World.add(engine.world, floor);

let gravityEnabled = false;
let duration = 0.75;
const easeOutQuad = (t) => t * (2 - t);

// Resize Handler
window.addEventListener("resize", () => {
  Body.setPosition(floor, {
    x: window.innerWidth / 2,
    y: window.innerHeight + 10,
  });

  // Update target posisi asli CSS setiap layar berubah
  initialPositions = getOriginCSSPositions();

  if (!gravityEnabled) {
    bodies.forEach((body, index) => {
      const pos = initialPositions[index];
      Body.setPosition(body, { x: pos.x, y: pos.y });
      Body.setAngle(body, 0);
    });
  }
});

// --- TOGGLE HANDLERS ---
infoToggle.addEventListener("click", () => {
  if (isAnimating) return;
  isAnimating = true;

  document.body.style.overflow = "hidden";
  if (typeof infosLenis !== "undefined") {
    infosLenis.scrollTo(0, { immediate: true });
  }

  if (!gravityEnabled) {
    engine.world.gravity.y = 1;
    bodies.forEach((body) => {
      Body.setStatic(body, false);
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.25);
    });
    gravityEnabled = true;
  }

  setTimeout(() => {
    isAnimating = false;
  }, 1000);
});

infoClose.addEventListener("click", () => {
  if (isAnimating) return;
  isAnimating = true;

  document.body.style.overflow = "auto";

  if (gravityEnabled) {
    // Matiin gravitasi langsung biar objek gak makin meluncur turun saat nunggu delay
    engine.world.gravity.y = 0;

    // --- DELAY 1 DETIK SEBELUM ANIMASI POSISI JALAN ---
    setTimeout(() => {
      bodies.forEach((body, index) => {
        Body.setStatic(body, true);
        const startPos = { x: body.position.x, y: body.position.y };
        const startAngle = body.angle;
        const endPos = {
          x: initialPositions[index].x,
          y: initialPositions[index].y,
        };
        const endAngle = 0;
        const startTime = performance.now();

        const animateBack = (currentTime) => {
          const elapsedTime = (currentTime - startTime) / 1000;
          const t = Math.min(elapsedTime / duration, 1);
          const easedT = easeOutQuad(t);

          const x = startPos.x + easedT * (endPos.x - startPos.x);
          const y = startPos.y + easedT * (endPos.y - startPos.y);
          const angle = startAngle + easedT * (endAngle - startAngle);

          Body.setPosition(body, { x, y });
          Body.setAngle(body, angle);

          if (t < 1) {
            requestAnimationFrame(animateBack);
          }
        };

        requestAnimationFrame(animateBack);
      });

      gravityEnabled = false;
    }, 1000); // <--- Delay 1000ms (1 detik)
  }

  // Timeout disesuaikan (1000ms delay + 1000ms waktu animasi = 2000ms total)
  setTimeout(() => {
    isAnimating = false;
  }, 2000);
});

// Loop Animasi Sync Matter.js -> DOM
Events.on(engine, "afterUpdate", () => {
  bodies.forEach((body, index) => {
    const item = items[index];
    item.style.top = `${body.position.y}px`;
    item.style.left = `${body.position.x}px`;
    item.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
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

// --- LOGIKA MULTI-BUTTONS ---
function initEnterBtnScramble() {
  const enterBtn = document.querySelector(".info-btn");
  if (!enterBtn) return;

  const pTag = enterBtn.querySelector("span");
  if (!pTag) return;

  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*?0123456789";
  const originalText = pTag.innerText;
  const textLength = originalText.length;

  // --- 1. PROSES SPLITTING TEXT (Pecah teks jadi span per huruf) ---
  let splitHTML = "";
  for (let i = 0; i < textLength; i++) {
    // Pertahankan spasi agar layout kata tidak berantakan saat diacak
    if (originalText[i] === " ") {
      splitHTML += `<span>&nbsp;</span>`;
    } else {
      splitHTML += `<span data-char="${originalText[i]}">${originalText[i]}</span>`;
    }
  }
  pTag.innerHTML = splitHTML;

  const letterSpans = pTag.querySelectorAll("span[data-char]");
  let enterTween = null;

  // --- 2. LOGIKA MOUSEENTER (Ombak Glitch Biru Meluncur) ---
  enterBtn.addEventListener("mouseenter", () => {
    if (enterTween) enterTween.kill();

    let progressObj = { value: 0 };

    enterTween = gsap.to(progressObj, {
      value: 1,
      duration: 0.6, // Durasi 0.6s pas banget buat aliran teks 14 karakter ini
      ease: "power1.out",
      onUpdate: () => {
        // Kita beri offset + 3 agar ombak meluncur mulus sampai huruf terakhir selesai
        const wavePosition = progressObj.value * (textLength + 3);

        letterSpans.forEach((span, i) => {
          const originalChar = span.getAttribute("data-char");

          if (i < wavePosition - 2.5) {
            span.innerText = originalChar;
            span.style.color = "var(--secondary)"; // Selesai ngacak, matang jadi warna terang
          } else if (i < wavePosition) {
            const randomChar =
              randomChars[Math.floor(Math.random() * randomChars.length)];
            span.innerText = randomChar;
            span.style.color = "var(--blue)"; // Menyala biru pas fase ngacak
          } else {
            span.innerText = originalChar;
            span.style.color = "var(--secondary)"; // Warna dasar/awal (Hitam)
          }
        });
      },
      onComplete: () => {
        // Kunci kondisi akhir biar gak ada huruf yang tertinggal ngacak
        letterSpans.forEach((span) => {
          span.innerText = span.getAttribute("data-char");
          span.style.color = "var(--secondary)";
        });
      },
    });
  });

  // --- 3. LOGIKA MOUSELEAVE (Rontok Warna Domino Balik ke Default) ---
  enterBtn.addEventListener("mouseleave", () => {
    if (enterTween) enterTween.kill();

    letterSpans.forEach((span, i) => {
      span.innerText = span.getAttribute("data-char");
      gsap.to(span, {
        color: "var(--secondary)", // Balik ke warna semula pas kursor keluar
        duration: 0.3,
        delay: i * 0.02, // Efek domino rontok dari depan ke belakang khas lo!
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  });
}

// Jalankan fungsinya setelah DOM siap
document.addEventListener("DOMContentLoaded", initEnterBtnScramble);

function initCloseBtnScramble() {
  const enterBtn = document.querySelector(".info-close");
  if (!enterBtn) return;

  const pTag = enterBtn.querySelector("p");
  if (!pTag) return;

  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*?0123456789";
  const originalText = pTag.innerText;
  const textLength = originalText.length;

  // --- 1. PROSES SPLITTING TEXT (Pecah teks jadi span per huruf) ---
  let splitHTML = "";
  for (let i = 0; i < textLength; i++) {
    // Pertahankan spasi agar layout kata tidak berantakan saat diacak
    if (originalText[i] === " ") {
      splitHTML += `<span>&nbsp;</span>`;
    } else {
      splitHTML += `<span data-char="${originalText[i]}">${originalText[i]}</span>`;
    }
  }
  pTag.innerHTML = splitHTML;

  const letterSpans = pTag.querySelectorAll("span[data-char]");
  let enterTween = null;

  // --- 2. LOGIKA MOUSEENTER (Ombak Glitch Biru Meluncur) ---
  enterBtn.addEventListener("mouseenter", () => {
    if (enterTween) enterTween.kill();

    let progressObj = { value: 0 };

    enterTween = gsap.to(progressObj, {
      value: 1,
      duration: 0.6, // Durasi 0.6s pas banget buat aliran teks 14 karakter ini
      ease: "power1.out",
      onUpdate: () => {
        // Kita beri offset + 3 agar ombak meluncur mulus sampai huruf terakhir selesai
        const wavePosition = progressObj.value * (textLength + 3);

        letterSpans.forEach((span, i) => {
          const originalChar = span.getAttribute("data-char");

          if (i < wavePosition - 2.5) {
            span.innerText = originalChar;
            span.style.color = "var(--primary)"; // Selesai ngacak, matang jadi warna terang
          } else if (i < wavePosition) {
            const randomChar =
              randomChars[Math.floor(Math.random() * randomChars.length)];
            span.innerText = randomChar;
            span.style.color = "var(--blue)"; // Menyala biru pas fase ngacak
          } else {
            span.innerText = originalChar;
            span.style.color = "var(--primary)"; // Warna dasar/awal (Hitam)
          }
        });
      },
      onComplete: () => {
        // Kunci kondisi akhir biar gak ada huruf yang tertinggal ngacak
        letterSpans.forEach((span) => {
          span.innerText = span.getAttribute("data-char");
          span.style.color = "var(--primary)";
        });
      },
    });
  });

  // --- 3. LOGIKA MOUSELEAVE (Rontok Warna Domino Balik ke Default) ---
  enterBtn.addEventListener("mouseleave", () => {
    if (enterTween) enterTween.kill();

    letterSpans.forEach((span, i) => {
      span.innerText = span.getAttribute("data-char");
      gsap.to(span, {
        color: "var(--primary)", // Balik ke warna semula pas kursor keluar
        duration: 0.3,
        delay: i * 0.02, // Efek domino rontok dari depan ke belakang khas lo!
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  });
}

// Jalankan fungsinya setelah DOM siap
document.addEventListener("DOMContentLoaded", initCloseBtnScramble);

function initAsciiBtnScramble() {
  const asciiBtn = document.querySelector(".ascii-btn");
  if (!asciiBtn) return;

  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*?0123456789";
  const btnTexts = asciiBtn.querySelectorAll(".btn-text");

  // --- HELPER FUNCTION 1: UPDATE WARNA SEMUA TOMBOL ---
  // Fungsi ini bertugas memaksa semua huruf kembali ke warna yang benar
  // sesuai status `.active-text` terbarunya (sangat krusial untuk mobile)
  function resetAllButtonColors() {
    btnTexts.forEach((btn) => {
      const letterSpans = btn.querySelectorAll("span[data-char]");
      const isActive = btn.classList.contains("active-text");

      letterSpans.forEach((span) => {
        // Hentikan tween warna individu yang sedang berjalan agar tidak tabrakan
        gsap.killTweensOf(span);

        span.innerText = span.getAttribute("data-char");
        span.style.color = isActive ? "var(--primary)" : "var(--secondary)";
      });
    });
  }

  // --- HELPER FUNCTION 2: FUNGSI UTAMA UNTUK MENGACAK TEKS ---
  function runScrambleAnimation(btn) {
    if (btn.scrambleTween) btn.scrambleTween.kill();

    const letterSpans = btn.querySelectorAll("span[data-char]");
    const textLength = letterSpans.length;
    let progressObj = { value: 0 };

    btn.scrambleTween = gsap.to(progressObj, {
      value: 1,
      duration: 0.4,
      ease: "power1.out",
      onUpdate: () => {
        const wavePosition = progressObj.value * (textLength + 3);

        letterSpans.forEach((span, i) => {
          const originalChar = span.getAttribute("data-char");

          if (i < wavePosition - 2.5) {
            span.innerText = originalChar;
            if (btn.classList.contains("active-text")) {
              span.style.color = "var(--primary)";
            } else {
              span.style.color = "var(--secondary)";
            }
          } else if (i < wavePosition) {
            const randomChar =
              randomChars[Math.floor(Math.random() * randomChars.length)];
            span.innerText = randomChar;
            span.style.color = "var(--blue)";
          } else {
            if (btn.classList.contains("active-text")) {
              span.style.color = "var(--primary)";
            } else {
              span.style.color = "var(--secondary)";
            }
          }
        });
      },
      onComplete: () => {
        letterSpans.forEach((span) => {
          span.innerText = span.getAttribute("data-char");
          span.style.color = btn.classList.contains("active-text")
            ? "var(--primary)"
            : "var(--secondary)";
        });
      },
    });
  }

  // --- 1. PROSES SPLITTING TEXT (Img & Ascii) ---
  btnTexts.forEach((btn) => {
    const originalText = btn.innerText;
    const textLength = originalText.length;

    let splitHTML = "";
    for (let i = 0; i < textLength; i++) {
      if (originalText[i] === " ") {
        splitHTML += `<span>&nbsp;</span>`;
      } else {
        splitHTML += `<span data-char="${originalText[i]}">${originalText[i]}</span>`;
      }
    }
    btn.innerHTML = splitHTML;

    const letterSpans = btn.querySelectorAll("span[data-char]");
    const isActive = btn.classList.contains("active-text");

    letterSpans.forEach((span) => {
      span.style.color = isActive ? "var(--primary)" : "var(--secondary)";
    });

    btn.scrambleTween = null;

    // --- 2. LOGIKA HOVER PER BUTTON TEXT (`mouseenter`) ---
    btn.addEventListener("mouseenter", () => {
      runScrambleAnimation(btn);
    });

    // --- 3. LOGIKA KURSOR KELUAR PER BUTTON TEXT (`mouseleave`) ---
    btn.addEventListener("mouseleave", () => {
      if (btn.scrambleTween) btn.scrambleTween.kill();

      const letterSpans = btn.querySelectorAll("span[data-char]");

      letterSpans.forEach((span, i) => {
        span.innerText = span.getAttribute("data-char");

        gsap.to(span, {
          color: btn.classList.contains("active-text")
            ? "var(--primary)"
            : "var(--secondary)",
          duration: 0.25,
          delay: i * 0.02,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    });

    // --- 4. LOGIKA KLIK DI VERSI MOBILE (< 768px) ---
    btn.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        // Berikan delay sangat tipis (10-50ms) menggunakan setTimeout
        // agar JS memberikan waktu bagi script toggle-class kamu untuk memindahkan class '.active-text' terlebih dahulu
        setTimeout(() => {
          // 1. Reset dan samakan warna semua tombol sesuai state active/inactive terbarunya
          resetAllButtonColors();

          // 2. Jalankan efek scramble khusus untuk tombol yang baru saja diklik
          runScrambleAnimation(btn);
        }, 50);
      }
    });
  });
}

// Jalankan fungsinya
document.addEventListener("DOMContentLoaded", initAsciiBtnScramble);

function initHeroTextRotator() {
  const targetTextElement = document.querySelector(".item-2 .text-change");
  if (!targetTextElement) return;

  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*?0123456789";

  const wordsList = [
    "Creative Developer",
    "Visual Designer",
    "Design Engineer",
    "a Human like You",
  ];

  let currentWordIndex = 0;
  let rotatorTween = null;

  // 1. SPLITTING AWAL (Menggunakan kata pertama)
  function initSplit(text) {
    let splitHTML = "";
    for (let i = 0; i < text.length; i++) {
      if (text[i] === " ") {
        splitHTML += `<span>&nbsp;</span>`;
      } else {
        splitHTML += `<span class="rotator-char" data-char="${text[i]}">${text[i]}</span>`;
      }
    }
    targetTextElement.innerHTML = splitHTML;
  }

  // 2. FUNGSI UTAMA: SATU OMBAK LANGSUNG SWAP KATA
  function triggerOneWaveTransition() {
    const oldWord = wordsList[currentWordIndex];
    currentWordIndex = (currentWordIndex + 1) % wordsList.length;
    const nextWord = wordsList[currentWordIndex];

    const maxLength = Math.max(oldWord.length, nextWord.length);

    let splitHTML = "";
    for (let i = 0; i < maxLength; i++) {
      const initialChar = oldWord[i] || " ";
      const targetChar = nextWord[i] || " ";

      const displayChar = initialChar === " " ? "&nbsp;" : initialChar;
      splitHTML += `<span class="rotator-char" data-char="${targetChar}" style="display:inline-block; min-width:1ch;">${displayChar}</span>`;
    }
    targetTextElement.innerHTML = splitHTML;

    const letterSpans = targetTextElement.querySelectorAll("span.rotator-char");
    let progressObj = { value: 0 };

    if (rotatorTween) rotatorTween.kill();

    rotatorTween = gsap.to(progressObj, {
      value: 1,
      duration: 1,
      ease: "power2.inOut",
      onUpdate: () => {
        const wavePosition = progressObj.value * (maxLength + 3);

        letterSpans.forEach((span, i) => {
          const targetChar = span.getAttribute("data-char");

          if (i < wavePosition - 2.5) {
            // A. EKOR OMBAK
            if (i >= nextWord.length) {
              // HANYA sembunyikan karakter sisa di luar panjang kata baru
              span.style.display = "none";
            } else if (targetChar === " ") {
              // JIKA ini spasi antar kata, TAMPILKAN sebagai spasi (&nbsp;)
              span.style.display = "inline-block";
              span.innerHTML = "&nbsp;";
            } else {
              // Karakter biasa
              span.style.display = "inline-block";
              span.innerText = targetChar;
              span.style.color = "var(--primary)";
            }
          } else if (i < wavePosition) {
            // B. INTI OMBAK: Glitch Effect
            // Jika target asli adalah spasi, jangan beri efek glitch angka/huruf acak
            if (targetChar === " " && i >= oldWord.length) {
              span.innerHTML = "&nbsp;";
            } else {
              const randomChar =
                randomChars[Math.floor(Math.random() * randomChars.length)];
              span.style.display = "inline-block";
              span.innerText = randomChar;
              span.style.color = "var(--blue)";
            }
          }
        });
      },
      onComplete: () => {
        gsap.delayedCall(3, triggerOneWaveTransition);
      },
    });
  }

  // JALANKAN PERTAMA KALI
  initSplit(wordsList[0]);
  gsap.delayedCall(3, triggerOneWaveTransition);
}

// Jalankan saat DOM siap
document.addEventListener("DOMContentLoaded", initHeroTextRotator);

window.dispatchEvent(new Event("threejsReady"));
