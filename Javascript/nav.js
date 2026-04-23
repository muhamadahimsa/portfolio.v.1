import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

// 1. DEKLARASI GLOBAL
window.isOpen = false;

function disableScroll() {
  if (window.lenis) window.lenis.stop();
  // Kita ganti class lock-scroll agar hanya mematikan swipe di mobile
  // Tanpa memotong overflow
  document.body.style.touchAction = "none";
}

function enableScroll() {
  if (window.lenis) window.lenis.start();
  document.body.style.touchAction = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector(".nav-btn");
  const navMenu = document.querySelector(".nav-menu");
  const navPages = document.querySelectorAll(".nav-menu-wrapper .ofh a");
  const navFooter = document.querySelectorAll(".nav-menu-footer .ofh p");
  const openText = document.querySelector(".open");
  const closeText = document.querySelector(".close");

  let isAnimating = false;

  // Reset clean state
  gsap.set(closeText, { y: "150%" });
  gsap.set(navPages, { "--ty": "110%" });
  gsap.set(navFooter, { "--ty": "110%" });

  // MAIN TIMELINE
  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power4.out" },
    onStart: () => (isAnimating = true),
    onComplete: () => (isAnimating = false),
    onReverseComplete: () => (isAnimating = false),
  });

  const lineTop = document.querySelector(".line.top");
  const lineBottom = document.querySelector(".line.bottom");

  tl.to(navMenu, { opacity: 1, duration: .1 }, 0)
    .to(
      navMenu,
      { height: "25rem", pointerEvents: "auto", duration: 1.0 },
      0,
    )
    .to(lineTop, { 
      y: 0,          // Balik ke titik 0 (tengah)
      rotation: 45,  // Putar 45 derajat
      duration: 1,
      ease: "power4.out"
    }, 0.1)
    .to(lineBottom, { 
      y: 0,          // Balik ke titik 0 (tengah)
      rotation: -45, // Putar -45 derajat
      duration: 1,
      ease: "power4.out"
    }, 0.1)
    .to(navPages, { "--ty": "0%", duration: 1, stagger: 0.05 }, 0.35)
    .to(navFooter, { "--ty": "0%", duration: 1, stagger: 0.05 }, 0.35)
    .to(openText, { y: "-200%", duration: 1 }, 0)
    .to(closeText, { y: "-0%", duration: 1 }, 0);

  // CLICK TOGGLE (Universal + Lenis Support)
  menuBtn.addEventListener("click", () => {
    if (isAnimating) return;

    if (!window.isOpen) {
      // PROSES BUKA
      tl.play();
      window.isOpen = true;

      disableScroll(); // Sekarang ini akan memanggil window.lenis.stop()

      window.dispatchEvent(
        new CustomEvent("navToggle", { detail: { open: true } }),
      );
    } else {
      // PROSES TUTUP
      isAnimating = true;
      tl.tweenTo(0, {
        duration: 1,
        ease: "power4.out",
        onComplete: () => {
          isAnimating = false;
          window.isOpen = false;

          enableScroll(); // Sekarang ini akan memanggil window.lenis.start()

          window.dispatchEvent(
            new CustomEvent("navToggle", { detail: { open: false } }),
          );
        },
      });
    }
  });

  function initNavMagnetic() {
    const navBtn = document.querySelector(".--magnetic");
    const navContent = navBtn.querySelector(".ofh");

    if (!navBtn) return; // Safety check jika class tidak ada

    navBtn.addEventListener("mousemove", (e) => {
      // Menggunakan status Global untuk stop magnet
      if (window.isOpen) return;

      const rect = navBtn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to(navBtn, {
        x: x * 0.35,
        y: y * 0.35,
        duration: 0.6,
        ease: "power2.out",
      });
      gsap.to(navContent, {
        x: x * 0.15,
        y: y * 0.15,
        duration: 0.6,
        ease: "power2.out",
      });
    });

    navBtn.addEventListener("mouseleave", () => {
      gsap.to([navBtn, navContent], {
        x: 0,
        y: 0,
        duration: 1,
        ease: "elastic.out(1, 0.3)",
      });
    });

    // Reset posisi saat tombol diklik (sebelum menu melebar)
    menuBtn.addEventListener("click", () => {
      if (window.isOpen) {
        // Logic: Jika tadinya tutup (sekarang proses buka)
        gsap.to([navBtn, navContent], {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: "power4.out",
        });
      }
    });
  }

  initNavMagnetic();
});
