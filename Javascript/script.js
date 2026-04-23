import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/meshoptimizer@0.18.1/meshopt_decoder.module.js";
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { vertexShader, fragmentShader } from "./shaders.js";
import { playGlitchSound } from "./audio.js";

document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  // --- 1. INITIALIZE LOADING MANAGER ---
  const loadingManager = new THREE.LoadingManager();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0.4, 1.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  hero.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight.position.set(15, 10, -5);
  scene.add(dirLight);

  const monitorGroup = new THREE.Group();
  scene.add(monitorGroup);

  // --- 2. LOADERS WITH MANAGER ---
  const allScreens = [];
  const textureLoader = new THREE.TextureLoader(loadingManager); // Added manager
  const textureCache = {};

  const defaultDisplayImg = "/Asset/Images/brutalist.webp";

  function loadTexture(src) {
    if (textureCache[src]) return textureCache[src];
    const texture = textureLoader.load(src);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    textureCache[src] = texture;
    return texture;
  }

  const baseMaterial = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: loadTexture(defaultDisplayImg) },
      imageAspect: { value: 1.0 },
      planeAspect: { value: 1.0 },
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      glitchIntensity: { value: 0.0 },
      time: { value: 0.0 },
    },
    vertexShader,
    fragmentShader,
  });

  const loader = new GLTFLoader(loadingManager); // Added manager
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load("/Asset/3D/monitors.glb", (gltf) => {
    const model = gltf.scene;
    model.scale.set(1.5, 1.5, 1.5);
    model.position.y = -0.8;
    model.position.z = -1.3;

    model.traverse((child) => {
      if (child.isMesh) {
        const name = child.name;
        if (name.includes("EMISSION")) {
          const screenMat = baseMaterial.clone();
          screenMat.uniforms.planeAspect.value = 1.0;
          screenMat.uniforms.imageAspect.value = 1.0;
          child.material = screenMat;
          allScreens.push(child);
        }
      }
    });
    monitorGroup.add(model);
  });

  // Mouse & Animation Logic
  const mouse = { x: 0, y: 0 };
  let gyro = { x: 0, y: 0 };
  const lerpedMouse = { x: 0, y: 0 };
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Gabungkan input Mouse/Touch dengan Gyro
    const targetX = mouse.x + gyro.x;
    const targetY = mouse.y + gyro.y;

    // Gunakan nilai gabungan untuk interpolasi
    lerpedMouse.x = gsap.utils.interpolate(lerpedMouse.x, targetX, 0.05);
    lerpedMouse.y = gsap.utils.interpolate(lerpedMouse.y, targetY, 0.05);

    // Monitor group akan merespon kemiringan HP
    monitorGroup.rotation.x = lerpedMouse.y * 0.1;
    monitorGroup.rotation.y = lerpedMouse.x * 0.2;

    // Jika monitorGroup punya monitor kecil di dalamnya, 
    // rotasi ini akan memberikan efek kedalaman yang keren
    renderer.render(scene, camera);
  }
  animate();

  function setDisplayImage(src) {
    const texture = loadTexture(src);
    allScreens.forEach((screen, index) => {
      gsap.killTweensOf(screen.material.uniforms.glitchIntensity);
      gsap.to(
        {},
        {
          duration: index * 0.08,
          onComplete: () => {
            screen.material.uniforms.map.value = texture;
            const updateAspect = () => {
              if (texture.image) {
                screen.material.uniforms.imageAspect.value =
                  texture.image.width / texture.image.height;
              }
            };
            if (texture.image && texture.image.complete) {
              updateAspect();
            } else {
              texture.addEventListener("load", updateAspect, { once: true });
            }
            screen.material.uniforms.glitchIntensity.value = 1.0;
            gsap.to(screen.material.uniforms.glitchIntensity, {
              value: 0,
              duration: 0.5,
              ease: "power2.out",
            });
          },
        },
      );
    });
  }

  // UI Event Listeners
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });

  // --- LOGIC GYRO UNTUK INDEX (RESPONSIVE) ---
  if (window.innerWidth <= 1200) {
    window.addEventListener("deviceorientation", (e) => {
      if (e.beta === null || e.gamma === null) return;

      // Normalisasi nilai agar seimbang dengan range mouse (-0.5 sampai 0.5)
      // Gamma: Miring kiri-kanan
      // Beta: Miring depan-belakang (dikurangi 45 derajat posisi normal)
      gyro.x = (e.gamma / 90) * 0.5; 
      gyro.y = ((e.beta - 45) / 90) * 0.5;
    }, true);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.querySelectorAll(".projects .project").forEach((li) => {
    li.addEventListener("mouseenter", () => {
      const img = li.getAttribute("data-img");
      if (img) setDisplayImage(img);
      playGlitchSound();
    });
  });

  const projectsEl = document.querySelector(".projects");
  if (projectsEl) {
    projectsEl.addEventListener("mouseleave", () => {
      setDisplayImage(defaultDisplayImg);
    });
  }

  // --- PROJECT LIST TEXT ANIMATION ---
  document.querySelectorAll(".project").forEach((item) => {
    item.addEventListener("mouseover", () => mouseOverAnimation(item));
    item.addEventListener("mouseout", () => mouseOutAnimation(item));
  });

  const mouseOverAnimation = (elem) => {
    gsap.to(elem.querySelectorAll("h1:nth-child(1)"), {
      top: "-100%",
      duration: 0.3,
      ease: "power2.out",
      overwrite: true,
    });
    gsap.to(elem.querySelectorAll("h1:nth-child(2)"), {
      top: "0%",
      duration: 0.3,
      ease: "power2.out",
      overwrite: true,
    });
  };

  const mouseOutAnimation = (elem) => {
    gsap.to(elem.querySelectorAll("h1:nth-child(1)"), {
      top: "0%",
      duration: 0.3,
      ease: "power2.out",
      overwrite: true,
    });
    gsap.to(elem.querySelectorAll("h1:nth-child(2)"), {
      top: "100%",
      duration: 0.3,
      ease: "power2.out",
      overwrite: true,
    });
  };

  // --- TIME FOOTER ---
  const updateTime = () => {
    const timeElement = document.querySelector(".time");
    if (timeElement) {
      const options = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const timeString = new Intl.DateTimeFormat("en-GB", options).format(
        new Date(),
      );
      timeElement.textContent = timeString.replace(/\./g, ":");
    }
  };
  setInterval(updateTime, 1000);
  updateTime();

  // --- LOADING & TRANSITION LOGIC ---
  function requestOrientationPermission() {
    // Cek apakah browser butuh izin (khusus iOS/Safari modern)
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            
          }
        })
        .catch(console.error);
    }
  }

  const loaderNum = document.getElementById("loader-number");

  function entryLoader() {
    if (!loaderNum) return;
    gsap.set(".loader-time", { display: "flex", opacity: 1 });
    gsap.fromTo(
      loaderNum,
      { top: "12rem" },
      { top: "0rem", duration: 1, ease: "power4.out" },
    );
  }

  function updateLoader(progress) {
    if (!loaderNum) return;
    const targetValue = Math.round(progress * 100);
    gsap.to(loaderNum, {
      innerText: targetValue,
      duration: 0.1,
      snap: { innerText: 1 },
    });
  }

  function exitLoader() {
    const loaderContainer = document.querySelector(".loader-time");
    if (!loaderNum || !loaderContainer) return;
    gsap.to(loaderNum, {
      top: "-12rem",
      duration: 0.8,
      ease: "power4.in",
      onComplete: () => {
        gsap.set(loaderContainer, { display: "none" });
        showEnterButton();
      },
    });
  }

  function showEnterButton() {
    const enterOverlay = document.getElementById("enter-overlay");
    const enterBtn = document.getElementById("enter-btn");
    if (!enterOverlay || !enterBtn) return;

    gsap.set(enterOverlay, { display: "flex" });
    gsap.fromTo(
      enterBtn,
      { translateY: "100%" },
      { translateY: "0%", duration: 1, ease: "power4.out" },
    );

    enterBtn.onclick = () => {
      // 2. REVISI DI SINI: Panggil izin sensor saat klik Enter
      requestOrientationPermission();

      if (window.revealTransition) window.revealTransition();
      gsap.to(enterBtn, {
        translateY: "100%",
        duration: 0.5,
        ease: "power4.in",
        onComplete: () => {
          gsap.set(enterOverlay, { display: "none" });
          gsap.set(enterBtn, { display: "none" });
          gsap.set(loaderNum, { display: "none" });
          document.documentElement.style.overflow = "auto";
          document.body.style.overflow = "auto";
          sessionStorage.setItem("hasLoadedIndex", "true");
        },
      });
    };
  }

  // Manager Events
  loadingManager.onStart = () => entryLoader();
  loadingManager.onProgress = (url, loaded, total) =>
    updateLoader(loaded / total);
  loadingManager.onLoad = () => {
    updateLoader(1);
    setTimeout(() => exitLoader(), 500);
  };

  // Trigger initial visual state
  entryLoader();

  // --- LOGIC VIEW PROJECTS (CUBE ROLL) ---
  const viewWrapper = document.querySelector(".view-wrapper");
  const projects = document.querySelectorAll(".projects .project");
  let currentCubeRotation = 0;
  let lastIndex = 0;

  // Bungkus link .view ke dalam wrapper jika belum ada (atau buat manual di HTML)
  // Di sini gue asumsikan lo sudah buat <div class="view-wrapper"> di dalam .view-projects
  projects.forEach((li, index) => {
    // Kita pakai satu listener untuk semua event mobile/desktop
    li.addEventListener("click", (e) => {
      if (window.innerWidth <= 1200) {
        // MATIKAN NAVIGASI TOTAL
        e.preventDefault();
        e.stopImmediatePropagation(); 

        // 1. Jalankan Glitch TV
        const img = li.getAttribute("data-img");
        if (img) setDisplayImage(img);
        playGlitchSound();

        // 2. Animasi Flip Teks (Manual Trigger)
        projects.forEach(p => mouseOutAnimation(p)); // Reset semua teks dulu
        mouseOverAnimation(li); // Naikkan teks yang diklik

        // 3. Logic Gulir Kubus (RotationX)
        // Index 0 -> 0deg, Index 1 -> 90deg, Index 2 -> 180deg, Index 3 -> 270deg
        gsap.to(".view-wrapper", {
          rotationX: index * 90, 
          duration: 0.5,
          ease: "power4.out"
        });
      }
    });

    // Tetap aktifkan hover untuk desktop (biar aman)
    li.addEventListener("mouseenter", () => {
      if (window.innerWidth > 1200) {
        const img = li.getAttribute("data-img");
        if (img) setDisplayImage(img);
        playGlitchSound();
      }
    });
  });

  // Listener leavetimer (TV kembali ke default)
  if (projectsEl) {
    projectsEl.addEventListener("mouseleave", () => {
      // Di mobile kita tidak ingin reset ke default saat jari lepas, 
      // tapi di desktop iya.
      if (window.innerWidth > 1200) {
        setDisplayImage(defaultDisplayImg);
      }
    });
  }

  // --- LOGIC KAMERA RESPONSIVE (768px) ---
  function adjustCamera() {
    if (window.innerWidth <= 768) {
      // Kamera menjauh di mobile agar monitor tidak kepotong
      gsap.to(camera.position, {
        z: 2, // Angka lebih besar = lebih jauh
        y: 0.5,
        duration: 1.2,
        ease: "power3.out"
      });
    } else {
      // Kamera kembali ke posisi default desktop
      gsap.to(camera.position, {
        z: 1.5,
        y: 0.4,
        duration: 1.2,
        ease: "power3.out"
      });
    }
  }

  // Panggil saat load dan saat resize
  adjustCamera();
  window.addEventListener("resize", adjustCamera);
});
