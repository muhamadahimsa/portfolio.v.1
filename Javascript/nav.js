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

  // initNavMagnetic();
});

function initNavScramble() {
  const navLinks = document.querySelectorAll(".nav-menu .ofh a");
  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*?0123456789";

  navLinks.forEach((link) => {
    const pTag = link.querySelector("p");
    if (!pTag) return;

    const originalText = pTag.innerText;
    const textLength = originalText.length;
    
    // 1. SPLIT TEXT: Pecah teks asli menjadi struktur span per huruf
    // Kita beri custom attribute data-char agar gampang kita manipulasi nanti
    let splitHTML = "";
    for (let i = 0; i < textLength; i++) {
      // Hilangkan spasi dari efek scramble agar layout tidak rusak
      if (originalText[i] === " ") {
        splitHTML += `<span>&nbsp;</span>`;
      } else {
        splitHTML += `<span data-char="${originalText[i]}">${originalText[i]}</span>`;
      }
    }
    pTag.innerHTML = splitHTML;

    // Ambil semua elemen span huruf yang baru saja dibuat
    const letterSpans = pTag.querySelectorAll("span[data-char]");
    let scrambleTween = null;

    link.addEventListener("mouseenter", () => {
      if (scrambleTween) scrambleTween.kill();

      let progressObj = { value: 0 };

      scrambleTween = gsap.to(progressObj, {
        value: 1,
        duration: 0.6, // Sikit dinaikkan jadi 0.6s biar durasi ngacaknya lebih puas dilihat
        ease: "power1.out",
        onUpdate: () => {
          // Kita kalikan dengan textLength + rentang offset (misal + 3) 
          // agar ombak biru berjalan duluan di depan, baru disusul ombak abu-abu
          const wavePosition = progressObj.value * (textLength + 3); 

          letterSpans.forEach((span, i) => {
            const originalChar = span.getAttribute("data-char");

            // 1. JIKA OMBAK BLUE SUDAH LEWAT JAUH (i < wavePosition - 2.5)
            // Huruf matang sempurna -> warna --primary + huruf asli
            if (i < wavePosition - 2.5) {
              span.innerText = originalChar;
              span.style.color = "var(--primary)";
            } 
            // 2. JIKA HURUF BERADA DI DALAM AREA OMBAK (i < wavePosition)
            // Di area inilah huruf DIPAKSA NGACAK lebih lama -> warna --blue + karakter acak
            else if (i < wavePosition) {
              const randomChar = randomChars[Math.floor(Math.random() * randomChars.length)];
              span.innerText = randomChar;
              span.style.color = "var(--blue)";
            } 
            // 3. JIKA OMBAK BELUM SAMPAI (i >= wavePosition)
            // Huruf antre menunggu giliran -> warna --secondary + huruf asli
            else {
              span.innerText = originalChar;
              span.style.color = "var(--secondary)";
            }
          });
        },
        onComplete: () => {
          // Kunci total ke kondisi akhir setelah timeline beres
          letterSpans.forEach((span) => {
            span.innerText = span.getAttribute("data-char");
            span.style.color = "var(--primary)";
          });
        }
      });
    });

    link.addEventListener("mouseleave", () => {
      if (scrambleTween) scrambleTween.kill();
      
      // RESET TOTAL: Kembalikan semua huruf ke warna `--secondary` (Hitam) dengan transisi halus
      letterSpans.forEach((span, i) => {
        span.innerText = span.getAttribute("data-char");
        gsap.to(span, { 
          color: "var(--secondary)", 
          duration: 0.3, 
          delay: i * 0.02, // Efek riak mundur halus dari depan ke belakang saat mouse keluar
          ease: "power2.out" 
        });
      });
    });
  });
}

function initBtnScramble() {
  const navBtn = document.querySelector(".nav-btn");
  if (!navBtn) return;

  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!?0123456789";
  const btnTexts = navBtn.querySelectorAll(".btn-text");

  // --- 1. PROSES SPLITTING TEXT (Menu & Close Sekaligus) ---
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
  });

  let btnTween = null;

  // --- 2. LOGIKA MOUSEENTER (HAJAR DUA-DUANYA BARENGAN) ---
  navBtn.addEventListener("mouseenter", () => {
    if (btnTween) btnTween.kill();

    let progressObj = { value: 0 };

    btnTween = gsap.to(progressObj, {
      value: 1,
      duration: 0.5,
      ease: "power1.out",
      onUpdate: () => {
        // Loop untuk memproses efek ombak di setiap elemen .btn-text secara paralel
        btnTexts.forEach((btn) => {
          const letterSpans = btn.querySelectorAll("span[data-char]");
          const textLength = letterSpans.length;
          const wavePosition = progressObj.value * (textLength + 3);

          letterSpans.forEach((span, i) => {
            const originalChar = span.getAttribute("data-char");

            if (i < wavePosition - 2.5) {
              span.innerText = originalChar;
              span.style.color = "var(--secondary)"; // Selesai ngacak jadi warna terang
            } else if (i < wavePosition) {
              const randomChar = randomChars[Math.floor(Math.random() * randomChars.length)];
              span.innerText = randomChar;
              span.style.color = "var(--blue)"; // Efek kilatan biru pas ngacak
            } else {
              span.innerText = originalChar;
              span.style.color = "var(--secondary)"; // Warna awal default sebelum diacak
            }
          });
        });
      },
      onComplete: () => {
        // Pastikan semua huruf di kedua tombol balik ke teks asli & warna terang
        btnTexts.forEach((btn) => {
          btn.querySelectorAll("span[data-char]").forEach((span) => {
            span.innerText = span.getAttribute("data-char");
            span.style.color = "var(--secondary)";
          });
        });
      }
    });
  });

  // --- 3. LOGIKA MOUSELEAVE (RESET WARNA DOMINO) ---
  navBtn.addEventListener("mouseleave", () => {
    if (btnTween) btnTween.kill();

    btnTexts.forEach((btn) => {
      const letterSpans = btn.querySelectorAll("span[data-char]");
      letterSpans.forEach((span, i) => {
        span.innerText = span.getAttribute("data-char");
        gsap.to(span, {
          color: "var(--secondary)", // Balik ke warna semula pas kursor keluar
          duration: 0.3,
          delay: i * 0.02, // Efek domino rontok yang mewah dari depan ke belakang
          ease: "power2.out",
          overwrite: "auto"
        });
      });
    });
  });
}

// Jalankan fungsinya
document.addEventListener("DOMContentLoaded", initBtnScramble);

// Jalankan fungsinya
document.addEventListener("DOMContentLoaded", initNavScramble);