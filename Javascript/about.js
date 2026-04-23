import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm';
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';

// Registrasi plugin GSAP (Wajib jika pakai ScrollTrigger)
gsap.registerPlugin(ScrollTrigger);

// variables
const imageContainer = document.getElementById("imageContainer");
const imageElement = document.getElementById("myImage");

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
    10
  );
  camera.position.z = 1;

  //   uniforms
  let shaderUniforms = {
    u_mouse: { type: "v2", value: new THREE.Vector2() },
    u_prevMouse: { type: "v2", value: new THREE.Vector2() },
    u_aberrationIntensity: { type: "f", value: 0.0 },
    u_texture: { type: "t", value: texture },
  };

  //   creating a plane mesh with materials
  planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1),
    new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      vertexShader,
      fragmentShader,
    })
  );

  // >>> taruh fungsi scale di sini
  function updatePlaneScale() {
    if (window.innerWidth <= 576) {
      planeMesh.scale.set(0.7, 0.7, 1); // mobile
    } else if (window.innerWidth <= 1200) {
      planeMesh.scale.set(0.9, 0.9, 1); // tablet
    } else {
      planeMesh.scale.set(1, 1, 1); // desktop
    }
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

// use the existing image from html in the canvas
initializeScene(new THREE.TextureLoader().load(imageElement.src));

animateScene();

function animateScene() {
  requestAnimationFrame(animateScene);

  mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
  mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

  planeMesh.material.uniforms.u_mouse.value.set(
    mousePosition.x,
    1.0 - mousePosition.y
  );

  planeMesh.material.uniforms.u_prevMouse.value.set(
    prevPosition.x,
    1.0 - prevPosition.y
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

// Arsip toggle fullscreen scroll
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
const coordX = document.getElementById("coordX");
const coordY = document.getElementById("coordY");
const dot = document.querySelector(".dot");

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let pos = { x: mouse.x, y: mouse.y };

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

gsap.ticker.add(() => {
  pos.x += (mouse.x - pos.x) * 0.12;
  pos.y += (mouse.y - pos.y) * 0.12;

  gsap.set(horizontal, { top: pos.y });
  gsap.set(vertical, { left: pos.x });
  gsap.set(dot, { x: pos.x, y: pos.y });

  coordX.textContent = Math.round(pos.x);
  coordY.textContent = Math.round(pos.y);
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

window.dispatchEvent(new Event("threejsReady"));
