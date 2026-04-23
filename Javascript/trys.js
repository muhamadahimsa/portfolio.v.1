import { awards } from "./data.js";
import { vertexShader, fragmentShader } from "./shaderArchives.js";
import { playGlitchSound, startBackgroundHum } from "./audio.js";

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
    link: "./archives1.html",
    title: "Sunset Over Hills",
  },
  {
    name: "./Asset/Videos/archive-2.mp4",
    link: "./archives2.html",
    title: "Mountain View",
  },
  {
    name: "./Asset/Videos/archive-3.mp4",
    link: "./archives3.html",
    title: "Ocean Waves",
  },
  {
    name: "./Asset/Videos/archive-4.mp4",
    link: "./archives4.html",
    title: "Forest Path",
  },
  {
    name: "./Asset/Videos/archive-5.mp4",
    link: "./archives5.html",
    title: "City Lights",
  },
  {
    name: "./Asset/Videos/archive-6.mp4",
    link: "./archives6.html",
    title: "Desert Dunes",
  },
  {
    name: "./Asset/Videos/archive-7.mp4",
    link: "./archives7.html",
    title: "River Stream",
  },
  {
    name: "./Asset/Videos/archive-8.mp4",
    link: "./archives8.html",
    title: "Starry Night",
  },
  {
    name: "./Asset/Videos/archive-9.mp4",
    link: "./archives9.html",
    title: "Snowy Peaks",
  },
  {
    name: "./Asset/Videos/archive-10.mp4",
    link: "./archives10.html",
    title: "Golden Fields",
  },
  {
    name: "./Asset/Videos/archive-11.mp4",
    link: "./archives6.html",
    title: "Desert Dunes",
  },
  {
    name: "./Asset/Videos/archive-12.mp4",
    link: "./archives7.html",
    title: "River Stream",
  },
  {
    name: "./Asset/Videos/archive-13.mp4",
    link: "./archives8.html",
    title: "Starry Night",
  },
  {
    name: "./Asset/Videos/archive-14.mp4",
    link: "./archives9.html",
    title: "Snowy Peaks",
  },
  {
    name: "./Asset/Videos/archive-15.mp4",
    link: "./archives10.html",
    title: "Golden Fields",
  },
  {
    name: "./Asset/Videos/archive-16.mp4",
    link: "./archives8.html",
    title: "Starry Night",
  },
  {
    name: "./Asset/Videos/archive-17.mp4",
    link: "./archives9.html",
    title: "Snowy Peaks",
  },
  {
    name: "./Asset/Videos/archive-18.mp4",
    link: "./archives10.html",
    title: "Golden Fields",
  },
];

// ====== POSISI MANUAL ======
const fixedPositions = [
  { x: -45, y: 20, z: 5.5, rotY: 1.1 }, // Kiri Atas
  { x: -35, y: 5, z: 3.5, rotY: 0.9 }, // Kiri Tengah
  { x: 5, y: -25, z: 0.8, rotY: -0.15 }, // Tengah Bawah (Agak Kanan)
  { x: -10, y: 15, z: 0.5, rotY: 0.25 }, // Tengah Atas (Agak Kiri)
  { x: -35, y: -20, z: 3.5, rotY: 0.9 }, // Kiri Bawah
  { x: -20, y: -10, z: 1.5, rotY: 0.5 }, // Kiri Tengah Dalam
  { x: -45, y: -35, z: 6.5, rotY: 1.15 }, // Kiri Jauh (Z ditingkatkan)
  { x: 45, y: 20, z: 5.5, rotY: -1.1 }, // Kanan Atas
  { x: 30, y: 10, z: 2.8, rotY: -0.8 }, // Kanan Tengah
  { x: -50, y: -5, z: 7.5, rotY: 1.25 }, // Kiri Jauh (Tadinya negatif, skrg sinkron ke Kiri)
  { x: 10, y: 17, z: 0.5, rotY: -0.25 }, // Kanan Atas Dalam
  { x: 37, y: -18, z: 3.8, rotY: -0.95 }, // Kanan Bawah
  { x: 18, y: -8, z: 1.2, rotY: -0.45 }, // Kanan Tengah Dalam
  { x: 50, y: -3, z: 7.2, rotY: -1.2 }, // Kanan Jauh
  { x: 0, y: 0, z: 0, rotY: 0 }, // Center (Anchor)
];

// ====== PARAMETER GALLERY ======
const params = {
  curvature: 5,
  imageWidth: 12,
  imageHeight: 6.75,
  depth: 10,
  elevation: 0,
  lookAtRange: 20,
  verticalCurvature: 0.5,
  totalVideos: 15,
  rangeX: 80,
  rangeY: 70,
};

let isMobile = window.innerWidth <= 1200;
let isSmallMobile = window.innerWidth <= 576;
let infoOpen = false;
let menuOpen = false;
let archivesOpen = false; // 🔥 flag archives

// ====== SCENE SETUP ======
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  25,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, 70);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// ====== HEADER ======
const header = document.querySelector(".header");
let headerRotationX = 0,
  headerRotationY = 0,
  headerTranslateZ = 0;

// ====== MOUSE & TARGET ======
let mouseX = 0,
  mouseY = 0;
let targetX = 0,
  targetY = 0;
let gyroX = 0,
  gyroY = 0;
let isDragging = false;
let lastPointerX = 0; // Referensi posisi pointer terakhir
let lastPointerY = 0;
const lookAtTarget = new THREE.Vector3(0, 0, 0);

// Fungsi untuk menangkap kemiringan
window.addEventListener(
  "deviceorientation",
  (e) => {
    if (!e.beta || !e.gamma) return;

    // Beta: Depan-Belakang (-180 ke 180). Kita ambil range natural pegangan HP
    // Gamma: Kiri-Kanan (-90 ke 90)
    gyroY = (e.beta - 45) * 0.02; // 45 derajat dianggap posisi netral pegang HP
    gyroX = e.gamma * 0.02;
  },
  true,
);

// ========================================================
// 🟩 MOBILE TOUCH DRAG + INERTIA
// ========================================================
if (window.innerWidth <= 1200) {
  let isDragging = false;
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

    // CLAMPING: Agar dragging tidak kebablasan keluar area video
    // Kita samakan batasnya dengan variabel maxX/maxY di fungsi animate
    const limitX = 1.2;
    const limitY = 1.0;
    mouseX = Math.max(-limitX, Math.min(limitX, mouseX));
    mouseY = Math.max(-limitY, Math.min(limitY, mouseY));

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

// ====== CREATE TITLE MESH ======
function createVideoTitleMesh(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const canvasWidth = 900;
  const canvasHeight = 52;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 1. Logika Capitalize (Huruf depan tiap kata besar)
  const toUpperCaseStr = (str) => {
    return str.toUpperCase();
  };

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 30px 'General'";

  // 2. Ubah Alignment ke Pojok Kanan
  ctx.textAlign = "right"; // Rata kanan
  ctx.textBaseline = "bottom"; // Rata bawah

  // 3. Render Teks (dengan sedikit padding agar tidak nempel banget ke pinggir canvas)
  const paddingX = 20;
  const paddingY = 5;
  ctx.fillText(
    toUpperCaseStr(text),
    canvasWidth - paddingX,
    canvasHeight - paddingY,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });

  const titleMesh = new THREE.Mesh(geometry, material);

  // 4. Atur Posisi Mesh agar lebih turun sedikit
  // Kita tambahkan nilai 'extraOffset' untuk menurunkannya lebih jauh dari video
  const extraOffset = 0.15;
  titleMesh.scale.set(params.imageWidth, 0.9, 1);
  titleMesh.position.y =
    -params.imageHeight / 2 - titleMesh.scale.y / 2 - extraOffset;

  return titleMesh;
}

// ====== CREATE VIDEO GROUP ======
let videos = [];
function createVideoPlane(videoData, positionData) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(
    params.imageWidth,
    params.imageHeight,
  );
  const video = createVideoElement(videoData.name);
  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.generateMipmaps = false;

  // --- START SHADER SETUP ---
  const material = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: videoTexture },
      time: { value: 0.0 },
      glitchIntensity: { value: 0.0 },
      imageAspect: { value: params.imageWidth / params.imageHeight },
      planeAspect: { value: params.imageWidth / params.imageHeight },
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
  // --- END SHADER SETUP ---

  const plane = new THREE.Mesh(geometry, material);
  const titleMesh = createVideoTitleMesh(videoData.title);
  group.add(plane);
  group.add(titleMesh);

  const { x, y, z, rotY } = positionData;
  const rotationX = (y / 100) * params.verticalCurvature * 0.5;
  group.position.set(x, y, z);
  group.rotation.set(rotationX, rotY, 0);

  group.userData = {
    video,
    basePosition: { x, y, z },
    baseRotation: { x: rotationX, y: rotY, z: 0 },
    parallaxFactor: Math.random() * 0.5 + 0.5,
    randomOffset: {
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 2 - 1,
    },
    rotationModifier: {
      x: Math.random() * 0.15 - 0.075,
      y: Math.random() * 0.15 - 0.075,
      z: Math.random() * 0.2 - 0.1,
    },
    phaseOffset: Math.random() * Math.PI * 2,
  };

  scene.add(group);
  return group;
}

// ====== UPDATE GALLERY ======
function updateGallery() {
  videos.forEach((group) => {
    // 1. CLEANUP THREE.JS RESOURCES (Dispose Memory)
    // Melakukan iterasi ke setiap mesh dalam group untuk menghapus geometri & material
    group.traverse((child) => {
      if (child.isMesh) {
        // Hapus geometri dari memori
        child.geometry.dispose();

        // Cek jika material memiliki texture/map dan hapus
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      }
    });

    // 2. CLEANUP VIDEO ELEMENT
    // Menghentikan stream video sepenuhnya agar CPU tidak terus memproses
    if (group.userData.video) {
      group.userData.video.pause();
      group.userData.video.src = ""; // Memutuskan link source
      group.userData.video.load(); // Paksa browser untuk 'melupakan' video
      group.userData.video.remove(); // Hapus dari DOM
    }

    // 3. REMOVE FROM SCENE
    scene.remove(group);
  });

  // 4. RESET ARRAY & REBUILD
  videos = [];
  for (let i = 0; i < params.totalVideos; i++) {
    const videoData = data[i];
    const positionData = fixedPositions[i];
    const group = createVideoPlane(videoData, positionData);
    videos.push(group);
  }
}

// ====== POINTER INTERACTION (MOUSE & TOUCHSCREEN) ======
let currentlyHovered = null;

// Mulai Drag / Sentuh
document.addEventListener("pointerdown", (e) => {
  if (isMouseOverOverlay(e)) return;
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
  if (menuOpen) return;

  const deltaX = event.clientX - lastPointerX;
  const deltaY = event.clientY - lastPointerY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  // 1. JIKA KURSOR DI ATAS MENU/NAV (OVERLAY)
  if (isMouseOverOverlay(event)) {
    if (currentlyHovered) {
      currentlyHovered.userData.video.pause();
      currentlyHovered = null;
    }
    // Paksa SEMUA video jadi bersih (glitch 0) & opacity normal
    videos.forEach((group) => {
      const mat = group.children[0].material;
      gsap.to(mat.uniforms.glitchIntensity, { value: 0.0, duration: 0.4 });
      if (group.children[1])
        gsap.to(group.children[1].material, { opacity: 1, duration: 0.4 });
    });
    document.body.style.cursor = "default";
    return;
  }

  // 2. LOGIKA DRAG & PARALLAX
  if (isDragging) {
    mouseX += deltaX * 0.003;
    mouseY += deltaY * 0.003;
  } else {
    mouseX += deltaX * 0.0015;
    mouseY += deltaY * 0.0015;
  }

  // 3. RAYCASTER (HOVER VIDEO)
  if (window.innerWidth > 1200) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      videos.map((g) => g.children[0]),
    );

    let hoverFound = false;
    if (intersects.length > 0) {
      initAudio();
      hoverFound = true;
      const newHovered = intersects[0].object.parent;

      if (newHovered !== currentlyHovered) {
        // Pause video lama jika ada
        if (currentlyHovered) {
          currentlyHovered.userData.video.pause();
          currentlyHovered.userData.video.currentTime = 0; // Reset biar rapi
        }

        playGlitchSound();
        currentlyHovered = newHovered;

        videos.forEach((group) => {
          const mat = group.children[0].material;
          const isTarget = group === currentlyHovered;
          const video = group.userData.video;

          if (isTarget) {
            // --- LOGIKA KHUSUS VIDEO TARGET (HOVER) ---
            const tl = gsap.timeline();

            tl.to(mat.uniforms.glitchIntensity, {
              value: 1.3, // 1. Meledak (TV Rusak parah)
              duration: 0.2,
              ease: "none",
            }).to(mat.uniforms.glitchIntensity, {
              value: 0.0, // 2. Langsung Jernih
              duration: 0.2,
              ease: "power2.in",
              onStart: () => {
                video.play(); // 3. Play video pas mulai proses jernih
              },
            });

            // Majukan posisi Z video yang aktif
            gsap.to(group.position, {
              z: group.userData.basePosition.z + 15,
              duration: 0.6,
              ease: "power3.out",
            });
          } else {
            // --- LOGIKA UNTUK VIDEO LAIN (OTHERS) ---
            gsap.to(mat.uniforms.glitchIntensity, {
              value: 0.6, // Tetap kemresek (TV salju)
              duration: 0.5,
              ease: "power2.out",
            });

            // Tetap di posisi Z semula atau agak mundur dikit
            gsap.to(group.position, {
              z: group.userData.basePosition.z,
              duration: 0.6,
              ease: "power3.out",
            });
          }

          // Opacity Title logic
          if (group.children[1]) {
            gsap.to(group.children[1].material, {
              opacity: isTarget ? 1.0 : 0.1,
              duration: 0.5,
            });
          }
        });
      }
    } else if (currentlyHovered) {
      currentlyHovered.userData.video.pause();
      currentlyHovered = null;

      videos.forEach((group) => {
        const mat = group.children[0].material;

        // Reset Glitch
        gsap.to(mat.uniforms.glitchIntensity, { value: 0.0, duration: 0.5 });

        // RESET POSISI Z (Balik ke posisi semula)
        gsap.to(group.position, {
          z: group.userData.basePosition.z,
          duration: 0.5,
          ease: "power2.inOut",
        });

        if (group.children[1])
          gsap.to(group.children[1].material, { opacity: 1, duration: 0.5 });
      });
    }
    document.body.style.cursor = hoverFound ? "pointer" : "default";
  }
});

window.addEventListener("click", (event) => {
  // Ini mencegah behavior default browser yang ganggu interaksi 3D
  if (window.innerWidth <= 1200) {
     // Optional: hanya prevent default di mobile jika klik terasa "loyo" atau double-tap zoom
     // event.preventDefault(); 
  }

  if (menuOpen) return;
  if (isMouseOverOverlay(event)) return;

  // Update koordinat mouse untuk raycaster saat diklik
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    videos.map((g) => g.children[0]),
  );

  if (intersects.length > 0) {
    const targetGroup = intersects[0].object.parent;

    // Jika di mobile (<= 1200px), jalankan logic hover (glitch + play) via klik
    if (window.innerWidth <= 1200) {
      if (currentlyHovered !== targetGroup) {
        // Reset video sebelumnya jika ada
        if (currentlyHovered) {
          currentlyHovered.userData.video.pause();
          gsap.to(
            currentlyHovered.children[0].material.uniforms.glitchIntensity,
            { value: 0, duration: 0.5 },
          );
          gsap.to(currentlyHovered.position, {
            z: currentlyHovered.userData.basePosition.z,
            duration: 0.5,
          });
        }

        // Aktifkan video baru (Gunakan logic hover lo yang lama)
        currentlyHovered = targetGroup;
        const mat = currentlyHovered.children[0].material;
        const video = currentlyHovered.userData.video;

        playGlitchSound();
        const tl = gsap.timeline();
        tl.to(mat.uniforms.glitchIntensity, { value: 1.3, duration: 0.2 }).to(
          mat.uniforms.glitchIntensity,
          {
            value: 0.0,
            duration: 0.2,
            onStart: () => video.play(),
          },
        );

        gsap.to(currentlyHovered.position, {
          z: currentlyHovered.userData.basePosition.z + 15,
          duration: 0.6,
        });

        // Buat video lain jadi burem/glitch dikit
        videos.forEach((v) => {
          if (v !== currentlyHovered) {
            gsap.to(v.children[0].material.uniforms.glitchIntensity, {
              value: 0.6,
              duration: 0.5,
            });
          }
        });
      }
    } else {
      // Logic desktop (pindah link) tetap seperti kode asli lo
      const destinationLink = targetGroup.userData.link;
      if (destinationLink) window.location.href = destinationLink;
    }
  } else {
    // KLIK DI AREA KOSONG: Reset semua video
    if (currentlyHovered) {
      currentlyHovered.userData.video.pause();
      currentlyHovered = null;
      videos.forEach((group) => {
        gsap.to(group.children[0].material.uniforms.glitchIntensity, {
          value: 0,
          duration: 0.5,
        });
        gsap.to(group.position, {
          z: group.userData.basePosition.z,
          duration: 0.5,
        });
        if (group.children[1])
          gsap.to(group.children[1].material, { opacity: 1, duration: 0.5 });
      });
    }
  }
});

// ====== RESIZE ======
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====== ANIMATE (dengan clamp posisi kamera agar tidak keluar batas) ======
function animate() {
  requestAnimationFrame(animate);

  if (archivesOpen) {
    // Matikan semua video gallery saat archives terbuka untuk hemat daya
    videos.forEach((v) => {
      if (!v.userData.video.paused) v.userData.video.pause();
    });
    renderer.render(scene, camera);
    return;
  }

  // BATAS MAKSIMAL DUNIA (Clamping)
  const maxX = 1.3; // Lu bisa naikin jadi 1.5 kalo mau jangkauan drag lebih luas
  const maxY = 1.1;

  let finalMouseX = mouseX + gyroX;
  let finalMouseY = mouseY + gyroY;

  // Clamp menggunakan nilai final
  finalMouseX = Math.max(-maxX, Math.min(maxX, finalMouseX));
  finalMouseY = Math.max(-maxY, Math.min(maxY, finalMouseY));

  // 3. REVISI: Gunakan 'finalMouse' untuk smoothing, bukan 'mouseX'
  targetX += (finalMouseX - targetX) * 0.025; // Sebelumnya: (mouseX - targetX)
  targetY += (finalMouseY - targetY) * 0.025; // Sebelumnya: (mouseY - targetY)

  header.style.transform = `translate(-50%,-50%) perspective(1000px)
    rotateX(${-targetY * 30}deg) rotateY(${targetX * 30}deg)
    translateZ(${Math.abs(targetX * targetY) * 50}px)`;

  lookAtTarget.x = targetX * params.lookAtRange;
  lookAtTarget.y = -targetY * params.lookAtRange;
  lookAtTarget.z = lookAtTarget.x ** 2 / (params.depth * params.curvature);

  const time = performance.now() * 0.001;

  videos.forEach((group) => {
    const plane = group.children[0];
    if (plane.material.uniforms.time) {
      plane.material.uniforms.time.value = performance.now() * 0.001;
    }

    const {
      video,
      basePosition,
      baseRotation,
      parallaxFactor,
      randomOffset,
      rotationModifier,
      phaseOffset,
    } = group.userData;

    const mouseDistance = Math.sqrt(targetX ** 2 + targetY ** 2);
    const parallaxX = targetX * parallaxFactor * 3 * randomOffset.x;
    const parallaxY = targetY * parallaxFactor * 3 * randomOffset.y;
    const oscillation = Math.sin(time + phaseOffset) * mouseDistance * 0.1;

    group.position.x =
      basePosition.x + parallaxX + oscillation * randomOffset.x;
    group.position.y =
      basePosition.y + parallaxY + oscillation * randomOffset.y;
    group.position.z =
      basePosition.z + oscillation * randomOffset.z * parallaxFactor;

    group.rotation.x =
      baseRotation.x +
      targetY * rotationModifier.x * mouseDistance +
      oscillation * rotationModifier.x * 0.2;
    group.rotation.y =
      baseRotation.y +
      targetX * rotationModifier.y * mouseDistance +
      oscillation * rotationModifier.y * 0.2;
    group.rotation.z =
      baseRotation.z +
      targetX * targetY * rotationModifier.z * 2 +
      oscillation * rotationModifier.z * 0.3;
  });

  camera.lookAt(lookAtTarget);
  renderer.render(scene, camera);
}

// ====== CEK OVERLAY HTML ======
function isMouseOverOverlay(event) {
  const selectorsToExclude = "nav, .archives-btn, .archives";
  return event.target.closest(selectorsToExclude) !== null;
}

// ====== RUN ======
updateGallery();
animate();

// ====== DOT COORDINATES (Gue jaga biar tetep sinkron) ======
const horizontal = document.querySelector(".horizontal");
const vertical = document.querySelector(".vertical");
const coordX = document.getElementById("coordX");
const coordY = document.getElementById("coordY");
const dot = document.querySelector(".dot");

let mouseDot = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let pos = { x: mouseDot.x, y: mouseDot.y };

window.addEventListener("mousemove", (e) => {
  mouseDot.x = e.clientX;
  mouseDot.y = e.clientY;
});

gsap.ticker.add(() => {
  pos.x += (mouseDot.x - pos.x) * 0.12;
  pos.y += (mouseDot.y - pos.y) * 0.12;
  gsap.set(horizontal, { top: pos.y });
  gsap.set(vertical, { left: pos.x });
  gsap.set(dot, { x: pos.x, y: pos.y });
  coordX.textContent = Math.round(pos.x);
  coordY.textContent = Math.round(pos.y);
});

// Archives
const archiveToggles = document.querySelectorAll(".btn-list");
const archiveClose = document.querySelector(".btn-globe");
const archives = document.querySelector(".archives");
const siteWrapper = document.querySelector(".site-wrapper");
const archiveWrapper = document.querySelector(".archive-wrapper");

// ====== ARCHIVES LOGIC (FIXED) ======
let archiveLenis = null; // Biarkan ini global

function initArchiveLenis() {
  archiveLenis = new Lenis({
    wrapper: archives,
    content: archiveWrapper,
    // 1. Durasi ditambah biar proses scrolling lebih lama/smooth
    duration: 2.2,
    // 2. Easing function (Power4.out memberikan feel berat di awal, halus di akhir)
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    // 3. Lerp (Linear Interpolation), makin kecil angkanya makin "berat" & "ngantuk" gerakannya
    lerp: 0.03,
    wheelMultiplier: 0.9, // Sedikit dikurangi biar gak terlalu sensitif
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

// Pastikan loop click handler-nya bener
archiveToggles.forEach((toggle) => {
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    archivesOpen = true;
    currentlyHovered = null;

    archives.scrollTop = 0;
    if (archiveLenis) archiveLenis.scrollTo(0, { immediate: true });

    archives.classList.add("active");
    document.body.style.overflow = "hidden";

    initArchiveLenis();

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
    });

    // Kita buat objek dummy buat nampung angka blur
    let blurObject = { value: 0 };

    tl.to(blurObject, {
      value: 20, // Target blur 20px
      duration: 1.2,
      onUpdate: () => {
        // Setiap frame, GSAP bakal update variabel CSS --blur pakai angka dari blurObject
        gsap.set(".archive-bg", {
          "--blur": `${blurObject.value}px`,
          opacity: blurObject.value / 20, // Opacity ikut naik seiring blur (opsional)
        });
      },
    })
      .to(
        ".archive-wrapper",
        {
          y: "0%",
          duration: 1,
        },
        "-=0.6",
      )
      .to(
        ".line",
        {
          backgroundColor: "#00000063",
          duration: 0.1,
        },
        "-=0.6",
      )
      .to(
        ".dot",
        {
          backgroundColor: "#000",
          duration: 0.1,
        },
        "-=0.6",
      );
  });
});

archiveClose.addEventListener("click", () => {
  archivesOpen = false;

  // 1. RESET SCROLL KE ATAS DULU
  // Ini kunci biar animasinya mulus dari titik 0
  if (archiveLenis) {
    archiveLenis.scrollTo(0, {
      immediate: true, // Langsung lompat ke atas tanpa animasi
    });
  } else {
    // Fallback kalau Lenis gak aktif
    archiveWrapper.scrollTop = 0;
  }

  // 2. JALANKAN ANIMASI TURUN
  gsap.to(".archive-wrapper", {
    y: "100%",
    duration: 1.0, // Sedikit dipercepat biar snappy
    ease: "power3.inOut", // InOut lebih smooth buat nutup total
    onComplete: () => {
      archives.classList.remove("active");
      document.body.style.overflow = "auto";

      // Cleanup Lenis
      if (archiveLenis) {
        archiveLenis.destroy();
        archiveLenis = null;
      }
    },
  });

  // Animasi lainnya tetep sama
  gsap.to(".archive-bg", {
    "--blur": "0px",
    duration: 0.5,
    ease: "power4.in",
  });

  gsap.to(".line", {
    backgroundColor: "rgba(255, 255, 255, 0.509)",
    duration: 0.1,
  });

  gsap.to(".dot", {
    backgroundColor: "#E6E6E6",
    duration: 0.1,
  });
});

const awardsListContainer = document.querySelector(".awards-list");
const awardPreview = document.querySelector(".award-preview");

const POSITIONS = {
  BOTTOM: 0,
  MIDDLE: -30,
  TOP: -60,
};

let lastMousePosition = { x: 0, y: 0 };
let activeAward = null;
let ticking = false;
let mouseTimeout = null;
let isMouseMoving = false;

// Fungsi untuk memaksa semua award balik ke posisi awal
function resetAllAwards() {
  awardsElements.forEach((award) => {
    const wrapper = award.querySelector(".award-wrapper");
    gsap.to(wrapper, {
      y: POSITIONS.BOTTOM, // Paksa balik ke bawah
      duration: 0.4,
      ease: "power2.out",
    });
  });

  // Opsional: Tutup semua video preview yang ada
  const previewVideos = awardPreview.querySelectorAll("video");
  previewVideos.forEach((vid) => {
    gsap.to(vid, {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      duration: 0.4,
      onComplete: () => {
        vid.pause();
        vid.remove();
      },
    });
  });
}

awards.forEach((award) => {
  const awardElement = document.createElement("div");
  awardElement.className = "award";

  awardElement.innerHTML = `
      <div class= "award-wrapper">
        <div class="award-name">
          <div class="award-name-wrapper">
            <p>${award.name}</p>
            <p>${award.year}</p>
          </div>
          <p class="type">${award.type}</p>
        </div>
        <div class="award-project">
          <p>${award.project}</p>
          <p>${award.label}</p>
        </div>
        <div class="award-name">
          <div class="award-name-wrapper">
            <p>${award.name}</p>
            <p>${award.year}</p>
          </div>
          <p class="type">${award.type}</p>
        </div>
      </div>
    `;

  awardsListContainer.appendChild(awardElement);
});

const awardsElements = document.querySelectorAll(".award");

// --- 2. MODIFIKASI LOOP UTAMA (MERGER) ---
awardsElements.forEach((award, index) => {
  const wrapper = award.querySelector(".award-wrapper");

  // Fungsi internal untuk menjalankan logic video & animasi (Logic asli lo)
  const activateAwardLogic = () => {
    activeAward = award;

    gsap.to(wrapper, {
      y: POSITIONS.MIDDLE,
      duration: 0.4,
      ease: "power2.out",
    });

    const existingVideos = awardPreview.querySelectorAll("video");
    existingVideos.forEach((v) => {
      v.pause();
      v.style.zIndex = "1";
    });

    const targetSrc = `./Asset/Videos/archive-${index + 1}.mp4`;
    let video = Array.from(existingVideos).find(
      (v) => v.getAttribute("src") === targetSrc,
    );

    if (!video) {
      video = document.createElement("video");
      video.src = targetSrc;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";

      Object.assign(video.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        webkitClipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
        clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      });

      awardPreview.appendChild(video);
    }

    video.style.zIndex = "2";
    video.play().then(() => {
      gsap.to(video, {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        webkitClipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 0.5,
        ease: "power3.out",
      });
    });
  };

  // --- PEMISAHAN EVENT BERDASARKAN DEVICE ---

  if (window.innerWidth > 1200) {
    // A. MODE DESKTOP: Tetap pakai Mouseenter & Mouseleave
    award.addEventListener("mouseenter", () => {
      activateAwardLogic();
    });

    award.addEventListener("mouseleave", (e) => {
      activeAward = null;
      const rect = award.getBoundingClientRect();
      const leavingFromTop = e.clientY < rect.top + rect.height / 2;
      const currentPosition = leavingFromTop ? POSITIONS.TOP : POSITIONS.BOTTOM;

      gsap.to(wrapper, {
        y: currentPosition,
        duration: 0.4,
        ease: "power2.out",
      });
    });
  } else {
    // B. MODE MOBILE/RESPONSIVE: Ganti jadi Klik
    award.addEventListener("click", (e) => {
      // Jika user klik award yang sama, maka tutup/reset
      if (activeAward === award) {
        resetAllAwards();
        activeAward = null;
      } else {
        // Bersihkan award lain dulu sebelum aktifkan yang baru
        resetAllAwards();
        activateAwardLogic();
      }
    });
  }
});

// Fungsi pembersih total saat kursor keluar dari area list
const animatePreview = () => {
  const awardsListRect = awardsListContainer.getBoundingClientRect();
  const isOutside =
    lastMousePosition.x < awardsListRect.left ||
    lastMousePosition.x > awardsListRect.right ||
    lastMousePosition.y < awardsListRect.top ||
    lastMousePosition.y > awardsListRect.bottom;

  if (isOutside) {
    const previewVideos = awardPreview.querySelectorAll("video");
    previewVideos.forEach((vid) => {
      if (!vid.dataset.isclosing) {
        vid.dataset.isclosing = "true";

        gsap.to(vid, {
          clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
          webkitClipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
          duration: 0.5,
          ease: "power3.in",
          onComplete: () => {
            vid.pause();
            vid.src = "";
            vid.remove();
          },
        });
      }
    });
  }
};

const updateAwards = () => {
  if (window.innerWidth <= 1200) return;
  animatePreview();

  if (activeAward) {
    const rect = activeAward.getBoundingClientRect();
    const isStillOver =
      lastMousePosition.x >= rect.left &&
      lastMousePosition.x <= rect.right &&
      lastMousePosition.y >= rect.top &&
      lastMousePosition.y <= rect.bottom;

    if (!isStillOver) {
      const wrapper = activeAward.querySelector(".award-wrapper");
      const leavingFromTop = lastMousePosition.y < rect.top + rect.height / 2;

      gsap.to(wrapper, {
        y: leavingFromTop ? POSITIONS.TOP : POSITIONS.BOTTOM,
        duration: 0.4,
        ease: "power2.out",
      });
      activeAward = null;
    }
  }

  awardsElements.forEach((award, index) => {
    if (award === activeAward) return;

    const rect = award.getBoundingClientRect();
    const isMouseOver =
      lastMousePosition.x >= rect.left &&
      lastMousePosition.x <= rect.right &&
      lastMousePosition.y >= rect.top &&
      lastMousePosition.y <= rect.bottom;

    if (isMouseOver) {
      const wrapper = award.querySelector(".award-wrapper");
      const enterFromTop = lastMousePosition.y < rect.top + rect.height / 2;

      gsap.to(wrapper, {
        y: POSITIONS.MIDDLE,
        duration: 0.4,
        ease: "power2.out",
      });
      activeAward = award;
    }
  });

  ticking = false;
};

document.addEventListener("mousemove", (e) => {
  lastMousePosition.x = e.clientX;
  lastMousePosition.y = e.clientY;

  isMouseMoving = true;
  if (mouseTimeout) {
    clearTimeout(mouseTimeout);
  }

  const awardsListRect = awardsListContainer.getBoundingClientRect();
  const isInsideAwardsList =
    lastMousePosition.x >= awardsListRect.left &&
    lastMousePosition.x <= awardsListRect.right &&
    lastMousePosition.y >= awardsListRect.top &&
    lastMousePosition.y <= awardsListRect.bottom;

  if (isInsideAwardsList) {
    mouseTimeout = setTimeout(() => {
      isMouseMoving = false;
      const images = awardPreview.querySelectorAll("img");
      if (images.length > 1) {
        const lastImage = images[images.length - 1];
        images.forEach((img) => {
          if (img !== lastImage) {
            gsap.to(img, {
              scale: 0,
              duration: 0.4,
              ease: "power2.out",
              onComplete: () => img.remove(),
            });
          }
        });
      }
    }, 2000);
  }

  animatePreview();
});

document.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateAwards();
      });
      ticking = true;
    }
  },
  { passive: true },
);

function disableTouchScroll(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
}

// ====== LOGIC CLICK OUTSIDE ======
window.addEventListener("click", (e) => {
  // Jika menu sedang buka atau archives tidak aktif, abaikan (opsional tergantung strukturmu)
  // if (!archivesOpen) return;

  // Cek apakah yang diklik BUKAN bagian dari awardsListContainer
  // dan juga pastikan kita sedang di mode mobile/responsive (innerWidth <= 1200)
  // karena di desktop hover sudah otomatis reset via mouseleave
  if (window.innerWidth <= 1200) {
    if (!awardsListContainer.contains(e.target)) {
      resetAllAwards();
      activeAward = null;
    }
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
