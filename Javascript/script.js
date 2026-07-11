import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/npm/meshoptimizer@0.18.1/meshopt_decoder.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
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

  const defaultDisplayImg = "./Asset/Images/home.webp";

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

  loader.load("./Asset/3D/monitors.glb", (gltf) => {
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
  let mouse = { x: 0, y: 0 };
  let gyro = { x: 0, y: 0 };
  const lerpedMouse = { x: 0, y: 0 };
  const clock = new THREE.Clock();

  // --- LOGIKA GYROSCOPE UNTUK MOBILE ---
  function initGyroscope() {
    if (window.DeviceOrientationEvent) {
      // Cek khusus untuk perangkat iOS (iPhone/iPad) yang butuh requestPermission
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        // Karena butuh interaksi user, kita tembak izinnya saat pertama kali user nge-tap layar mobile
        window.addEventListener(
          "click",
          function requestGyro() {
            DeviceOrientationEvent.requestPermission()
              .then((permissionState) => {
                if (permissionState === "granted") {
                  window.addEventListener(
                    "deviceorientation",
                    handleOrientation,
                  );
                }
              })
              .catch(console.error);

            // Hapus listener ini setelah sekali klik agar tidak request berulang-ulang
            window.removeEventListener("click", requestGyro);
          },
          { once: true },
        );
      } else {
        // Untuk Android dan browser non-iOS bisa langsung pasang listener
        window.addEventListener("deviceorientation", handleOrientation);
      }
    }
  }

  function handleOrientation(event) {
    // gamma: kemiringan kiri-kanan (-90 sampai 90)
    // beta: kemiringan depan-belakang (-180 sampai 180)
    const x = event.gamma;
    const y = event.beta;

    // Kita batasi (clamp) dan normalisasi nilainya menjadi range -1 sampai 1
    // Angka pembagi (misal 30) menentukan seberapa sensitif ayunan HP-nya
    const maxTilt = 30;

    gyro.x = Math.max(-1, Math.min(1, x / maxTilt));
    gyro.y = Math.max(-1, Math.min(1, (y - 45) / maxTilt));
    // Catatan: (y - 45) berasumsi user memegang HP agak miring 45 derajat saat melihat layar (posisi santai), bukan flat di meja.
  }

  // Jalankan fungsi inisialisasi gyro-nya
  if (window.innerWidth <= 576) {
    initGyroscope();
  }

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
    window.addEventListener(
      "deviceorientation",
      (e) => {
        if (e.beta === null || e.gamma === null) return;

        // Normalisasi nilai agar seimbang dengan range mouse (-0.5 sampai 0.5)
        // Gamma: Miring kiri-kanan
        // Beta: Miring depan-belakang (dikurangi 45 derajat posisi normal)
        gyro.x = (e.gamma / 90) * 0.5;
        gyro.y = ((e.beta - 45) / 90) * 0.5;
      },
      true,
    );
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

  const projectsA = document.querySelectorAll(".project");
  const projectsContainer = document.querySelector(".projects");
  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!?0123456789";

  mouse = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };

  function init3DCubes() {
    gsap.set(projectsContainer, { xPercent: -50, yPercent: -50 });

    projectsA.forEach((project, index) => {
      const cube = project.querySelector(".cube");
      const sides = project.querySelectorAll("h1");

      if (!cube || sides.length < 4) return;

      // --- 1. PROSES SPLITTING TEXT (SAMA PERSIS DENGAN NAV-MENU) ---
      const originalText = sides[0].innerText;
      const textLength = originalText.length;

      let splitHTML = "";
      for (let i = 0; i < textLength; i++) {
        if (originalText[i] === " ") {
          splitHTML += `<span>&nbsp;</span>`;
        } else {
          splitHTML += `<span data-char="${originalText[i]}">${originalText[i]}</span>`;
        }
      }

      // Suntik kode HTML span ke keempat sisi kubus
      sides.forEach((h1) => (h1.innerHTML = splitHTML));

      // Setup ukuran 3D Kubus dasar
      const width = project.getBoundingClientRect().width;
      const halfWidth = width / 2;

      gsap.set(sides[0], { rotationY: 0, z: 0 });
      gsap.set(sides[1], { rotationY: 90, x: halfWidth, z: -halfWidth });
      gsap.set(sides[2], { rotationY: 180, z: -width });
      gsap.set(sides[3], { rotationY: -90, x: -halfWidth, z: -halfWidth });
      gsap.set(cube, {
        transformOrigin: `50% 50% -${halfWidth}px`,
        z: 0,
        rotationY: 0,
      });

      cube.style.setProperty("--cube-depth", `${width}px`);

      project.isHovered = false;
      project.currentSide = 0;
      project.scrambleTween = null;
    });

    // MASTER CLOCK GLOBAL
    function triggerGlobalRotation() {
      gsap.to(document.querySelectorAll(".project .cube"), {
        rotationY: (index, target) => {
          const parentProject = target.closest(".project");
          if (parentProject.isHovered) return parentProject.currentSide * -90;

          parentProject.currentSide++;
          return parentProject.currentSide * -90;
        },
        duration: 1,
        ease: "power3.inOut",
        stagger: 0.3,
      });
      gsap.delayedCall(2.5, triggerGlobalRotation);
    }
    gsap.delayedCall(1.5, triggerGlobalRotation);

    // --- 2. LOGIKA INTERAKSI KURSOR DENGAN REPLIKASI RUMUS NAV-MENU DEWA ---
    projectsA.forEach((project) => {
      const cube = project.querySelector(".cube");
      const sides = project.querySelectorAll("h1");
      const originalText = sides[0].innerText;
      const textLength = originalText.length;

      function activateCube() {
        project.isHovered = true;

        // Maju secara 3D
        gsap.to(cube, {
          z: 1,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
        });

        // Efek Scramble
        if (project.scrambleTween) project.scrambleTween.kill();
        let progressObj = { value: 0 };

        project.scrambleTween = gsap.to(progressObj, {
          value: 1,
          duration: 0.6, // Durasi disamakan persis dengan nav-menu lo
          ease: "power1.out", // Easing disamakan persis dengan nav-menu lo
          onUpdate: () => {
            // Rumus wavePosition disamakan persis dengan nav-menu lo
            const wavePosition = progressObj.value * (textLength + 3);

            // KUNCI KESEMBUHAN: Kita pecah perulangan langsung per sisi h1
            sides.forEach((h1) => {
              const letterSpans = h1.querySelectorAll("span[data-char]");

              letterSpans.forEach((span, i) => {
                const originalChar = span.getAttribute("data-char");

                // Logika matematika murni 1:1 dari nav-menu lo, bro!
                if (i < wavePosition - 3.5) {
                  span.innerText = originalChar;
                  span.style.color = "var(--primary)"; // Mengunci warna hitam di atas bg putih
                } else if (i < wavePosition) {
                  const randomChar =
                    randomChars[Math.floor(Math.random() * randomChars.length)];
                  span.innerText = randomChar;
                  span.style.color = "var(--blue)"; // Flashing biru saat ngacak
                } else {
                  span.innerText = originalChar;
                  span.style.color = "var(--primary)"; // Warna awal abu-abu
                }
              });
            });
          },
          onComplete: () => {
            sides.forEach((h1) => {
              h1.querySelectorAll("span[data-char]").forEach((span) => {
                span.innerText = span.getAttribute("data-char");
                span.style.color = "var(--primary)";
              });
            });
          },
        });
      }

      function deactivateCube() {
        project.isHovered = false;

        gsap.to(cube, {
          z: 0,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
        });

        if (project.scrambleTween) project.scrambleTween.kill();

        sides.forEach((h1) => {
          const letterSpans = h1.querySelectorAll("span[data-char]");
          letterSpans.forEach((span, i) => {
            span.innerText = span.getAttribute("data-char");
            gsap.to(span, {
              color: "var(--primary)",
              duration: 0.3,
              delay: i * 0.02, // Efek riak mundur halus dari nav-menu lo
              ease: "power2.out",
              overwrite: "auto",
            });
          });
        });
      }

      // ==========================================
      // BIND EVENT (Solusi Fix Flicker & Opacity)
      // ==========================================
      project.addEventListener("mouseenter", () => {
        if (window.innerWidth > 576) {
          activateCube();

          // Ambil semua H1 dari project LAIN, lalu turunkan opacity-nya
          projectsA.forEach((otherProject) => {
            if (otherProject !== project) {
              const otherSides = otherProject.querySelectorAll("h1");
              gsap.to(otherSides, {
                opacity: 0.4,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto",
              });
            }
          });
        }
      });

      project.addEventListener("mouseleave", () => {
        if (window.innerWidth > 576) {
          deactivateCube();

          // Kembalikan semua H1 di SEMUA project ke opacity penuh
          projectsA.forEach((p) => {
            const allSides = p.querySelectorAll("h1");
            gsap.to(allSides, {
              opacity: 1,
              duration: 0.3,
              ease: "power2.out",
              overwrite: "auto",
            });
          });
        }
      });

      project.addEventListener("click", (e) => {
        if (window.innerWidth <= 576) {
          if (!project.isHovered) {
            e.preventDefault();
            projectsA.forEach((p) => {
              if (p !== project && p.isHovered) {
                const otherCube = p.querySelector(".cube");
                p.isHovered = false;
                gsap.to(otherCube, {
                  z: 0,
                  duration: 0.5,
                  ease: "power3.out",
                  overwrite: "auto",
                });
                p.querySelectorAll("h1 span[data-char]").forEach(
                  (s) => (s.style.color = "var(--primary)"),
                );
              }

              // Handler opacity untuk device mobile / touch
              const sides = p.querySelectorAll("h1");
              gsap.to(sides, {
                opacity: p === project ? 1 : 0.4,
                duration: 0.3,
                overwrite: "auto",
              });
            });
            activateCube();
          }
        }
      });
    });

    // PARALLAX TILT CONTAINER (Tetap seperti kemarin)
    window.addEventListener("mousemove", (e) => {
      if (window.innerWidth <= 576) return;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouse.x = (e.clientX - centerX) / centerX;
      mouse.y = (e.clientY - centerY) / centerY;
    });

    gsap.ticker.add(() => {
      if (window.innerWidth > 576) {
        target.x += (mouse.x - target.x) * 0.08;
        target.y += (mouse.y - target.y) * 0.08;
        gsap.set(projectsContainer, {
          rotationX: target.y * -15,
          rotationY: target.x * 15,
        });
      } else {
        gsap.set(projectsContainer, { rotationX: 0, rotationY: 0 });
      }
    });
  }

  window.addEventListener("load", init3DCubes);

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
      { translateY: "0%", duration: 0.3, ease: "power4.in" },
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

  projects.forEach((li, index) => {
    // KITA SATUKAN DI SINI BIAR TIDAK SALING BLOKIR
    li.addEventListener("click", (e) => {
      if (window.innerWidth <= 1200) {
        // MATIKAN NAVIGASI TOTAL
        e.preventDefault();
        e.stopImmediatePropagation();

        // 1. Jalankan Glitch TV
        const img = li.getAttribute("data-img");
        if (img) setDisplayImage(img);
        playGlitchSound();

        // 3. Logic Gulir Kubus (RotationX)
        gsap.to(".view-wrapper", {
          rotationX: index * 90,
          duration: 0.5,
          ease: "power4.out",
        });
      }

      // 4. LOGIKA OPACITY & 3D CUBE UNTUK MOBILE (DIPINDAH KE SINI)
      if (window.innerWidth <= 576) {
        // Anggap 'li' adalah 'project' yang sedang di-tap
        if (!li.isHovered) {
          // Loop ke semua project untuk mengatur opacity h1 & reset state project lain
          projectsA.forEach((p) => {
            const targetSides = p.querySelectorAll("h1");
            const otherCube = p.querySelector(".cube");

            if (p !== li) {
              p.isHovered = false;

              if (p.scrambleTween) p.scrambleTween.kill();

              gsap.to(otherCube, {
                z: 0,
                duration: 0.5,
                ease: "power3.out",
                overwrite: "auto",
              });

              p.querySelectorAll("h1 span[data-char]").forEach((s) => {
                s.style.color = "var(--primary)";
              });

              // Redupkan h1 project lain
              gsap.to(targetSides, {
                opacity: 0.4,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto",
              });
            } else {
              // Terangkan h1 project yang sedang di-tap aktif
              gsap.to(targetSides, {
                opacity: 1,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto",
              });
            }
          });

          // Panggil fungsi activateCube bawaan project ini (bisa diakses jika fungsinya global atau di dalam scope yang sama)
          // Jika activateCube() tidak terbaca di scope ini, pindahkan triggers pemicunya ke sini.
          if (typeof activateCube === "function") {
            activateCube();
          } else if (li.activateCube) {
            li.activateCube(); // Jika di-bind ke elemennya
          }
        }
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

  // --- LOGIC KAMERA RESPONSIVE (768px) ---
  function adjustCamera() {
    if (window.innerWidth <= 768) {
      // Kamera menjauh di mobile agar monitor tidak kepotong
      gsap.to(camera.position, {
        z: 2, // Angka lebih besar = lebih jauh
        y: 0.5,
        duration: 1.2,
        ease: "power3.out",
      });
    } else {
      // Kamera kembali ke posisi default desktop
      gsap.to(camera.position, {
        z: 1.5,
        y: 0.4,
        duration: 1.2,
        ease: "power3.out",
      });
    }
  }

  // Panggil saat load dan saat resize
  adjustCamera();
  window.addEventListener("resize", adjustCamera);
});

function initEnterBtnScramble() {
  const enterBtn = document.getElementById("enter-btn");
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
            span.style.color = "var(--secondary)"; // Warna dasar/awal (Hitam)
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
