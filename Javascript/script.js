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
  renderer.toneMappingExposure = 1.0;
  hero.appendChild(renderer.domElement);

  // --- 2. SETUP RENDER TARGET & POST-PROCESSING SCENE ---
  const renderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio(),
  );

  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const postVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const postFragmentShader = `
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

        vec2 uvOffset = strength * -mouseDirection * 0.2;
        vec2 uv = vUv - uvOffset;

        vec4 colorR = texture2D(u_texture, uv + vec2(strength * u_aberrationIntensity * 0.01, 0.0));
        vec4 colorG = texture2D(u_texture, uv);
        vec4 colorB = texture2D(u_texture, uv - vec2(strength * u_aberrationIntensity * 0.01, 0.0));

        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
    }
  `;

  const postUniforms = {
    u_texture: { value: renderTarget.texture },
    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    u_prevMouse: { value: new THREE.Vector2(0.5, 0.5) },
    u_aberrationIntensity: { value: 0.0 },
  };

  const postMaterial = new THREE.ShaderMaterial({
    vertexShader: postVertexShader,
    fragmentShader: postFragmentShader,
    uniforms: postUniforms,
  });

  const postPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
  postScene.add(postPlane);

  // --- 3. MOUSE & POST-PROCESSING VARIABLES ---
  let mousePos = { x: 0.5, y: 0.5 };
  let targetMousePos = { x: 0.5, y: 0.5 };
  let prevMousePos = { x: 0.5, y: 0.5 };
  let aberration = 0.0;

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    prevMousePos = { ...targetMousePos };

    targetMousePos.x = (e.clientX - rect.left) / rect.width;
    targetMousePos.y = (e.clientY - rect.top) / rect.height;

    aberration = 1.0;
  });

  // --- LIGHTING SETUP (FOR THREE.JS r170) ---
  const ceilingDirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  ceilingDirLight.position.set(0, 4, 2);
  scene.add(ceilingDirLight);

  const roomCeilingLight = new THREE.PointLight(0xffffff, 40.0, 20);
  roomCeilingLight.position.set(0, 1.8, -0.5);
  scene.add(roomCeilingLight);

  const roomAmbient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(roomAmbient);

  const monitorGroup = new THREE.Group();
  scene.add(monitorGroup);

  // --- 4. LOADERS & MODEL ---
  const allScreens = [];
  const textureLoader = new THREE.TextureLoader(loadingManager);
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

  const loader = new GLTFLoader(loadingManager);
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

  // --- 5. MOUSE 3D TILT & GYROSCOPE LOGIC ---
  let mouse = { x: 0, y: 0 };
  let gyro = { x: 0, y: 0 };
  const lerpedMouse = { x: 0, y: 0 };
  const clock = new THREE.Clock();

  function initGyroscope() {
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
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

            window.removeEventListener("click", requestGyro);
          },
          { once: true },
        );
      } else {
        window.addEventListener("deviceorientation", handleOrientation);
      }
    }
  }

  function handleOrientation(event) {
    const x = event.gamma;
    const y = event.beta;
    const maxTilt = 30;

    gyro.x = Math.max(-1, Math.min(1, x / maxTilt));
    gyro.y = Math.max(-1, Math.min(1, (y - 45) / maxTilt));
  }

  if (window.innerWidth <= 576) {
    initGyroscope();
  }

  // --- 6. SINGLE INTEGRATED ANIMATE LOOP ---
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // A. Update 3D Tilt Monitors
    const targetX = mouse.x + gyro.x;
    const targetY = mouse.y + gyro.y;

    lerpedMouse.x = gsap.utils.interpolate(lerpedMouse.x, targetX, 0.05);
    lerpedMouse.y = gsap.utils.interpolate(lerpedMouse.y, targetY, 0.05);

    monitorGroup.rotation.x = lerpedMouse.y * 0.1;
    monitorGroup.rotation.y = lerpedMouse.x * 0.2;

    // B. Update Post-Processing Shader Pixel
    mousePos.x += (targetMousePos.x - mousePos.x) * 0.02;
    mousePos.y += (targetMousePos.y - mousePos.y) * 0.02;

    postUniforms.u_mouse.value.set(mousePos.x, 1.0 - mousePos.y);
    postUniforms.u_prevMouse.value.set(prevMousePos.x, 1.0 - prevMousePos.y);

    aberration = Math.max(0.0, aberration - 0.05);
    postUniforms.u_aberrationIntensity.value = aberration;

    // C. DOUBLE-PASS RENDERING
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
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

  if (window.innerWidth <= 1200) {
    window.addEventListener(
      "deviceorientation",
      (e) => {
        if (e.beta === null || e.gamma === null) return;
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
    renderTarget.setSize(
      window.innerWidth * renderer.getPixelRatio(),
      window.innerHeight * renderer.getPixelRatio(),
    );

    adjustCamera();
  });

  const projectsEl = document.querySelector(".projects");
  if (projectsEl) {
    projectsEl.addEventListener("mouseleave", () => {
      setDisplayImage(defaultDisplayImg);
    });
  }

  // --- PROJECT LIST TEXT ANIMATION & CUBES ---
  const projectsA = document.querySelectorAll(".projects .project");
  const projectsContainer = document.querySelector(".projects");
  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!?0123456789";

  let target = { x: 0, y: 0 };

  function init3DCubes() {
    if (!projectsContainer) return;
    gsap.set(projectsContainer, { xPercent: -50, yPercent: -50 });

    projectsA.forEach((project) => {
      const cube = project.querySelector(".cube");
      const sides = project.querySelectorAll("h1");

      if (!cube || sides.length < 4) return;

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

      sides.forEach((h1) => (h1.innerHTML = splitHTML));

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

      // ATTACH FUNGSI UNTUK MOBILE TRIGGER
      project.activateCube = function () {
        project.isHovered = true;

        gsap.to(cube, {
          z: 1,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto",
        });

        if (project.scrambleTween) project.scrambleTween.kill();
        let progressObj = { value: 0 };

        project.scrambleTween = gsap.to(progressObj, {
          value: 1,
          duration: 0.6,
          ease: "power1.out",
          onUpdate: () => {
            const wavePosition = progressObj.value * (textLength + 3);

            sides.forEach((h1) => {
              const letterSpans = h1.querySelectorAll("span[data-char]");

              letterSpans.forEach((span, i) => {
                const originalChar = span.getAttribute("data-char");

                if (i < wavePosition - 3.5) {
                  span.innerText = originalChar;
                  span.style.color = "var(--primary)";
                } else if (i < wavePosition) {
                  const randomChar =
                    randomChars[Math.floor(Math.random() * randomChars.length)];
                  span.innerText = randomChar;
                  span.style.color = "var(--blue)";
                } else {
                  span.innerText = originalChar;
                  span.style.color = "var(--primary)";
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
      };

      project.deactivateCube = function () {
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
              delay: i * 0.02,
              ease: "power2.out",
              overwrite: "auto",
            });
          });
        });
      };

      // HOVER UNTUK DESKTOP
      project.addEventListener("mouseenter", () => {
        if (window.innerWidth > 576) {
          project.activateCube();

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
          project.deactivateCube();

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
    });

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

  // Inisialisasilangsung
  init3DCubes();

  // --- LOGIC VIEW PROJECTS (CUBE ROLL & MOBILE CLICK) ---
  projectsA.forEach((li, index) => {
    li.addEventListener("click", (e) => {
      if (window.innerWidth <= 1200) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // 1. Jalankan Glitch TV
        const img = li.getAttribute("data-img");
        if (img) setDisplayImage(img);
        if (typeof playGlitchSound === "function") playGlitchSound();

        // 2. Logic Gulir Kubus View Wrapper (RotationX)
        gsap.to(".view-wrapper", {
          rotationX: index * 90,
          duration: 0.5,
          ease: "power4.out",
        });
      }

      // 3. LOGIKA OPACITY & 3D CUBE UNTUK MOBILE (DIPINDAH KE SINI)
      if (window.innerWidth <= 576) {
        if (!li.isHovered) {
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

              gsap.to(targetSides, {
                opacity: 0.4,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto",
              });
            } else {
              gsap.to(targetSides, {
                opacity: 1,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto",
              });
            }
          });

          if (typeof li.activateCube === "function") {
            li.activateCube();
          }
        }
      }
    });

    li.addEventListener("mouseenter", () => {
      if (window.innerWidth > 1200) {
        const img = li.getAttribute("data-img");
        if (img) setDisplayImage(img);
        if (typeof playGlitchSound === "function") playGlitchSound();
      }
    });
  });

  // --- LOGIKA RESET SAAT KLIK DI LUAR PROJECTS (CLICK OUTSIDE) ---
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 576) {
      const isClickedOnProject = e.target.closest(".projects .project");

      if (!isClickedOnProject) {
        projectsA.forEach((p) => {
          p.isHovered = false;

          if (p.scrambleTween) p.scrambleTween.kill();

          const targetSides = p.querySelectorAll("h1");
          const otherCube = p.querySelector(".cube");

          if (otherCube) {
            gsap.to(otherCube, {
              z: 0,
              duration: 0.5,
              ease: "power3.out",
              overwrite: "auto",
            });
          }

          p.querySelectorAll("h1 span[data-char]").forEach((s) => {
            s.style.color = "var(--primary)";
          });

          gsap.to(targetSides, {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
      }
    }
  });

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

  gsap.set("nav", {
    top: "-5rem",
  });
  gsap.set(".projects", {
    scale: 0,
  });
  gsap.set(".footer-wrapper .ofh h4, .footer-wrapper .ofh p", {
    y: "100%",
  });

  // --- INTRO ANIMATION LOGIC ---
  function playIntroAnimation() {
    const tl = gsap.timeline();

    // 1. Animasi Kamera Zoom-In lembut dari kejauhan
    const targetCameraZ = window.innerWidth <= 768 ? 2 : 1.5;
    const targetCameraY = window.innerWidth <= 768 ? 0.5 : 0.4;

    gsap.fromTo(
      camera.position,
      { z: targetCameraZ + 1.2, y: targetCameraY + 0.3 },
      {
        z: targetCameraZ,
        y: targetCameraY,
        duration: 1.8,
        ease: "power3.out",
      },
    );

    // 2. Animasi UI Elements (Nav, Projects, Footer)
    tl.to("nav", {
      top: "1.5rem", // atau style top default nav kamu
      duration: 1,
      delay: 1,
      ease: "power4.out",
    })
      .to(
        ".projects",
        {
          scale: 1,
          duration: 1.2,
          ease: "back.out(1.4)", // Efek pop-out membal yang halus
        },
        "-=0.6", // Stagger agar overlap dengan animasi nav
      )
      .to(
        ".footer-wrapper .ofh h4, .footer-wrapper .ofh p",
        {
          y: "0%",
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        },
        "-=0.8",
      );
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
      if (window.revealTransition) window.revealTransition();

      playIntroAnimation();

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

  loadingManager.onStart = () => entryLoader();
  loadingManager.onProgress = (url, loaded, total) =>
    updateLoader(loaded / total);
  loadingManager.onLoad = () => {
    updateLoader(1);
    setTimeout(() => exitLoader(), 500);
  };

  entryLoader();

  // --- LOGIC KAMERA RESPONSIVE ---
  function adjustCamera() {
    if (window.innerWidth <= 768) {
      gsap.to(camera.position, {
        z: 2,
        y: 0.5,
        duration: 1.2,
        ease: "power3.out",
      });
    } else {
      gsap.to(camera.position, {
        z: 1.5,
        y: 0.4,
        duration: 1.2,
        ease: "power3.out",
      });
    }
  }

  adjustCamera();
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

function initHeroTextRotator() {
  const targetTextElement = document.querySelector(
    ".footer-wrapper .text-change",
  );
  if (!targetTextElement) return;

  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*?0123456789";

  const wordsList = ["Creative Developer", "Visual Designer"];

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

    // Cari tahu jumlah karakter terbanyak antara kata lama vs kata baru
    // Ini penting supaya tidak ada huruf yang kepotong di tengah jalan
    const maxLength = Math.max(oldWord.length, nextWord.length);

    // RE-STRUCTURE SPAN: Samakan jumlah span dengan maxLength sebelum animasi jalan
    let splitHTML = "";
    for (let i = 0; i < maxLength; i++) {
      // Ambil huruf lama sebagai tampilan awal sebelum disapu ombak
      const initialChar = oldWord[i] || " ";
      // Ambil target huruf baru yang akan muncul setelah ombak lewat
      const targetChar = nextWord[i] || " ";

      if (initialChar === " " && targetChar === " ") {
        splitHTML += `<span>&nbsp;</span>`;
      } else {
        // Simpan karakter lama di innerText, dan target baru di data-char!
        const displayChar = initialChar === " " ? "&nbsp;" : initialChar;
        splitHTML += `<span class="rotator-char" data-char="${targetChar}">${displayChar}</span>`;
      }
    }
    targetTextElement.innerHTML = splitHTML;

    const letterSpans = targetTextElement.querySelectorAll("span.rotator-char");
    let progressObj = { value: 0 };

    if (rotatorTween) rotatorTween.kill();

    // TEMBAK SATU OMBAK KONTINU (Dibuat sedikit lebih lama: 0.9 detik biar megah)
    rotatorTween = gsap.to(progressObj, {
      value: 1,
      duration: 0.9,
      ease: "power1.inOut",
      onUpdate: () => {
        const wavePosition = progressObj.value * (maxLength + 3);

        letterSpans.forEach((span, i) => {
          const targetChar = span.getAttribute("data-char");

          if (i < wavePosition - 2.5) {
            // A. EKOR OMBAK: Teks sudah berubah total jadi kalimat baru
            if (targetChar === " ") {
              span.innerHTML = "&nbsp;";
            } else {
              span.innerText = targetChar;
            }
            span.style.color = "var(--primary)"; // Berwarna terang benderang
          } else if (i < wavePosition) {
            // B. INTI OMBAK: Proses pengacakan matrix (Glitch Biru)
            const randomChar =
              randomChars[Math.floor(Math.random() * randomChars.length)];
            span.innerText = randomChar;
            span.style.color = "var(--blue)";
          }
          // C. DEPAN OMBAK: Tetap menampilkan kalimat lama (tidak disentuh, warna tidak berubah)
        });
      },
      onComplete: () => {
        // Bersihkan spasi kosong berlebih di akhir kata jika kalimat baru lebih pendek
        // Biar DOM-nya tetep clean
        initSplit(nextWord);

        // TUNGGU 3 DETIK, LALU GANTI KATA LAGI
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
