import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/meshoptimizer@0.18.1/meshopt_decoder.module.js";
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { vertexShader, fragmentShader } from "./shaders.js";
import { playGlitchSound } from "./audio.js";

// ====== CONFIGURATION & DATA ======
const hero = document.querySelector("#container");

if (hero) {
  const isPage404 =
    document.body.classList.contains("page-404") ||
    !document.querySelector(".projects");

  const defaultDisplayImg = "./Asset/Images/404.webp";
  const tvModelPath = "./Asset/3D/retro_tv.glb";

  const manualOffsetX = 0.53;
  const manualOffsetY = -0.1;
  const manualOffsetZ = 0;

  // ====== RESPONSIVE CONFIGURATION ======
  const responsiveData = {
    desktop: [
      { p: [-0.5, -0.6, -1.2], s: 0.8, r: [0, 4.95, 0] },
      { p: [1.5, -0.2, -3], s: 1.1, r: [0, 4.75, 0] },
      { p: [3, -1.2, -1.75], s: 1.35, r: [0, 4.5, 0] },
      { p: [-1.5, 1.3, -7.5], s: 0.8, r: [0.3, 5, 0] },
      { p: [9, 3, -16.8], s: 1.0, r: [-0.2, 4.5, 0] },
      { p: [-2, 1.3, -4], s: 0.9, r: [0.3, 5, 0] },
    ],
    tablet: [
      { p: [-0.4, -0.5, -1.5], s: 0.7, r: [0, 5, 0] },
      { p: [1.2, -0.1, -3.5], s: 0.9, r: [0, 4.8, 0] },
      { p: [2.2, -1.0, -2.5], s: 1.1, r: [0, 4.6, 0] },
      { p: [-1.2, 1.0, -8], s: 0.7, r: [0.3, 5.2, 0] },
      { p: [6, 2, -15], s: 0.8, r: [-0.2, 4.6, 0] },
      { p: [-1.8, 1.0, -5], s: 0.8, r: [0.3, 5.2, 0] },
    ],
    mobile: [
      { p: [0.2, -0.2, -2.5], s: 0.6, r: [0, 4.95, 0] },
      { p: [0.8, 0.5, -4.5], s: 0.7, r: [0, 5, 0] },
      { p: [0.5, 1.5, -5.5], s: 0.7, r: [0, 4.5, 0] },
      { p: [0, -1.2, -4.5], s: 0.8, r: [0, 5, 0] },
      { p: [2, -1, -10], s: 0.9, r: [0, 4.5, 0] },
      { p: [2.2, -3, -10], s: 0.9, r: [0, 4.65, 0] },
    ]
  };

  function getCurrentTVConfigs() {
    const width = window.innerWidth;
    if (width < 768) return responsiveData.mobile;
    if (width < 1200) return responsiveData.tablet;
    return responsiveData.desktop;
  }

  // ====== 1. INITIALIZE SCENE ======
  const loadingManager = new THREE.LoadingManager();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 2.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  hero.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(0, 5, 5);
  scene.add(dirLight);

  const monitorGroup = new THREE.Group();
  scene.add(monitorGroup);
  const tvGroups = [];

  // ====== 2. TEXTURE & SHADER MATERIAL ======
  const allScreens = [];
  const textureLoader = new THREE.TextureLoader(loadingManager);
  const textureCache = {};

  function loadTexture(src) {
    if (textureCache[src]) return textureCache[src];
    const texture = textureLoader.load(src);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    textureCache[src] = texture;
    return texture;
  }

  const baseMaterial = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: loadTexture(defaultDisplayImg) },
      imageAspect: { value: 1.0 },
      planeAspect: { value: 1.0 },
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      glitchIntensity: { value: 0.0 },
      time: { value: 0.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  // ====== 3. LOAD MODEL ======
  const loader = new GLTFLoader(loadingManager);
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load(tvModelPath, (gltf) => {
    const masterTV = gltf.scene;
    const currentConfigs = getCurrentTVConfigs();

    currentConfigs.forEach((config, tvIndex) => {
      const pivotProxy = new THREE.Group();
      const tvClone = masterTV.clone();
      tvClone.position.set(manualOffsetX, manualOffsetY, manualOffsetZ);
      pivotProxy.add(tvClone);
      pivotProxy.position.set(...config.p);
      pivotProxy.scale.setScalar(config.s);
      pivotProxy.rotation.set(...config.r);

      let meshCount = 0;
      tvClone.traverse((child) => {
        if (child.isMesh) {
          meshCount++;
          if (child.name.includes("Object_2") || meshCount === 2) {
            const screenMat = baseMaterial.clone();
            child.material = screenMat;
            allScreens.push(child);
          }
          if (child.name.includes("Object_3") || meshCount === 3) child.visible = false;
        }
      });
      monitorGroup.add(pivotProxy);
      tvGroups.push(pivotProxy);
    });
  });

  // ====== 4. INTERACTION & DRAGGABLE LOGIC ======
  const mouse = { x: 0, y: 0 };
  const lerpedMouse = { x: 0, y: 0 };
  let lastMousePos = { x: 0, y: 0 };
  let mouseVelocity = 0;
  let isDragging = false; // Flag untuk draggable mode
  const clock = new THREE.Clock();

  function triggerGlitch(intensity) {
    const cappedIntensity = Math.min(intensity, 1.0);
    if (typeof playGlitchSound === "function") playGlitchSound();

    allScreens.forEach((screen, index) => {
      gsap.killTweensOf(screen.material.uniforms.glitchIntensity);
      const distanceBoost = 1 + (index * 0.2);
      const finalIntensity = cappedIntensity * distanceBoost;

      gsap.to(screen.material.uniforms.glitchIntensity, {
        value: finalIntensity,
        duration: 0.05,
        delay: index * 0.01, 
        onComplete: () => {
          gsap.to(screen.material.uniforms.glitchIntensity, {
            value: 0,
            duration: 0.5,
            ease: "power2.out",
          });
        },
      });
    });
  }

  // Handle Dragging State
  window.addEventListener("mousedown", () => { if(window.innerWidth < 1200) isDragging = true; });
  window.addEventListener("touchstart", () => { if(window.innerWidth < 1200) isDragging = true; });
  window.addEventListener("mouseup", () => { isDragging = false; });
  window.addEventListener("touchend", () => { isDragging = false; });

  window.addEventListener("mousemove", (e) => { handlePointerMove(e.clientX, e.clientY); });
  window.addEventListener("touchmove", (e) => { handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); });

  function handlePointerMove(clientX, clientY) {
    // 1. Konversi posisi mouse ke koordinat -0.5 sampai 0.5
    const rawX = clientX / window.innerWidth - 0.5;
    const rawY = clientY / window.innerHeight - 0.5;

    // 2. TENTUKAN BATASAN (CLAMPING)
    // Semakin kecil angkanya, semakin sempit area geraknya.
    // Desktop biasanya lebih lebar, Mobile lebih sempit.
    const limitX = window.innerWidth < 1200 ? 0.3 : 0.6; 
    const limitY = window.innerWidth < 1200 ? 0.2 : 0.4;

    // Kita paksa nilai x dan y supaya nggak ngelewatin limit
    mouse.x = Math.max(-limitX, Math.min(limitX, rawX));
    mouse.y = Math.max(-limitY, Math.min(limitY, rawY));

    if (isPage404) {
      const dx = clientX - lastMousePos.x;
      const dy = clientY - lastMousePos.y;
      mouseVelocity = Math.sqrt(dx * dx + dy * dy);

      const isMobileMode = window.innerWidth < 1200;

      // Logic Glitch
      if (!isMobileMode) {
        if (mouseVelocity > 20) triggerGlitch(mouseVelocity / 150);
      } else {
        // Hanya glitch kalau sedang di-drag dan dalam batas
        if (isDragging && mouseVelocity > 10) triggerGlitch(mouseVelocity / 100);
      }
    }
    lastMousePos.x = clientX;
    lastMousePos.y = clientY;
  }

  // ====== 5. ANIMATION LOOP ======
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    lerpedMouse.x = gsap.utils.interpolate(lerpedMouse.x, mouse.x, 0.05);
    lerpedMouse.y = gsap.utils.interpolate(lerpedMouse.y, mouse.y, 0.05);

    monitorGroup.rotation.x = lerpedMouse.y * 0.15;
    monitorGroup.rotation.y = lerpedMouse.x * 0.25;

    allScreens.forEach((screen) => {
      screen.material.uniforms.time.value = elapsedTime;
    });

    renderer.render(scene, camera);
  }
  animate();

  // ====== 6. PROJECT INTERACTION ======
  function setDisplayImage(src) {
    const texture = loadTexture(src);
    allScreens.forEach((screen, index) => {
      gsap.to({}, {
        duration: index * 0.05,
        onComplete: () => {
          screen.material.uniforms.map.value = texture;
          const update = () => {
            if (texture.image) {
              screen.material.uniforms.imageAspect.value = texture.image.width / texture.image.height;
              texture.needsUpdate = true;
            }
          };
          if (texture.image && texture.image.complete) update();
          else texture.addEventListener("load", update, { once: true });
          triggerGlitch(0.8);
        },
      });
    });
  }

  if (!isPage404) {
    document.querySelectorAll(".projects .project").forEach((li) => {
      li.addEventListener("mouseenter", () => {
        const img = li.getAttribute("data-img");
        if (img) setDisplayImage(img);
      });
    });
    const pEl = document.querySelector(".projects");
    if (pEl) pEl.addEventListener("mouseleave", () => setDisplayImage(defaultDisplayImg));
  }

  // ====== 7. RESPONSIVE RESIZE ======
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const newConfigs = getCurrentTVConfigs();
    tvGroups.forEach((group, i) => {
      if (newConfigs[i]) {
        gsap.to(group.position, { x: newConfigs[i].p[0], y: newConfigs[i].p[1], z: newConfigs[i].p[2], duration: 0.8 });
        gsap.to(group.scale, { x: newConfigs[i].s, y: newConfigs[i].s, z: newConfigs[i].s, duration: 0.8 });
        gsap.to(group.rotation, { x: newConfigs[i].r[0], y: newConfigs[i].r[1], z: newConfigs[i].r[2], duration: 0.8 });
      }
    });
  });
}

// --- LOGIKA SCRAMBLE BUTTONS ---
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
      duration: 0.8, // Durasi 0.6s pas banget buat aliran teks 14 karakter ini
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

window.dispatchEvent(new Event("threejsReady"));
