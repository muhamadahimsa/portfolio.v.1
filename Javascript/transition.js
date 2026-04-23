import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const ease = "power4.inOut";

function revealTransition() {
  const mainContainer = document.querySelector(".transition");

  gsap.set(".block", { visibility: "visible", scaleY: 1, scaleX: 1.02 });

  return gsap.to(".block", {
    scaleY: 0,
    duration: 1,
    stagger: { each: 0.1, from: "start", grid: "auto", axis: "x" },
    ease: ease,
    onComplete: () => {
      gsap.set(".block", { visibility: "hidden" });

      if (mainContainer) {
        gsap.set(mainContainer, {
          autoAlpha: 0,
          pointerEvents: "none",
        });
      }

      // REVISI BRUTAL UNTUK UNLOCK:
      document.body.classList.remove("noscroll"); // Hapus class CSS jika ada

      // Paksa semua elemen kunci ke default
      const resetStyles = {
        overflow: "visible", // Paksa ke visible agar scrollbar muncul
        height: "auto",
        position: "relative", // Pastikan bukan fixed/absolute
        touchAction: "auto",
      };

      Object.assign(document.documentElement.style, resetStyles);
      Object.assign(document.body.style, resetStyles);
    },
  });
}

function animateTransition() {
  const mainContainer = document.querySelector(".transition");

  // SOLUSI: Hidupkan kembali container sebelum tirai menutup
  if (mainContainer) {
    gsap.set(mainContainer, {
      autoAlpha: 1,
      pointerEvents: "auto",
    });
  }

  gsap.set(".block", { visibility: "visible", scaleY: 0, scaleX: 1.02 });
  return gsap.to(".block", {
    scaleY: 1,
    duration: 1,
    stagger: { each: 0.1, from: "start", grid: [2, 6], axis: "x" },
    ease: ease,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loaderExists = document.querySelector(".loader-time");
  const mainContainer = document.querySelector(".transition");
  const threeJsContainer = document.getElementById("p5-container"); // Cek apakah ini halaman 3D

  // Kunci scroll saat tirai masih tertutup
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  if (loaderExists) {
    // Logic untuk Index (yang pakai tombol Enter)
    window.addEventListener("triggerReveal", () => {
      revealTransition();
    }, { once: true });
  } 
  else if (threeJsContainer) {
    // LOGIC BARU: Jika ini halaman 3D (seperti 404)
    // Tunggu sinyal 'threejsReady' baru buka tirai
    window.addEventListener("threejsReady", () => {
      console.log("3D Objects Ready. Opening transition...");
      revealTransition();
    }, { once: true });

    // Fail-safe: Jika dalam 6 detik sinyal gak muncul, buka paksa
    setTimeout(() => {
      revealTransition();
    }, 6000);
  } 
  else {
    // Halaman normal tanpa 3D: Langsung buka
    revealTransition();
  }

  // FILTER LINK KETAT
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    const target = link.getAttribute("target");

    // Validasi: Harus ada href, bukan anchor (#), bukan tab baru, dan domain yang sama
    if (
      href &&
      !href.startsWith("#") &&
      target !== "_blank" &&
      link.hostname === window.location.hostname &&
      href !== window.location.pathname + window.location.search
    ) {
      e.preventDefault();
      animateTransition().then(() => {
        window.location.href = href;
      });
    }
  });

  // MENGATASI BUG "BACK BUTTON" (BFCACHE)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      // Jika halaman diambil dari cache (tombol back), reset & buka lagi
      gsap.set(".block", { scaleY: 1 });
      revealTransition();
    }
  });
});

let isRevealed = false;

// TAMBAHKAN INI: Agar bisa dipanggil dari file lain
window.revealTransition = revealTransition;
window.animateTransition = animateTransition;
