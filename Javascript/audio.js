// audio.js
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function playGlitchSound() {
  // Ganti isi fungsi di audio.js
  const bufferSize = audioCtx.sampleRate * .1; // Durasi 2 detik
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate White Noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000; // Biar suaranya garing (crispy)

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Volume pelan
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

// Tambahkan fungsi ini di audio.js
export function startBackgroundHum() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine'; // Suara dengung halus
    oscillator.frequency.setValueAtTime(50, audioCtx.currentTime); // Frekuensi rendah (bass)
    
    gainNode.gain.value = 0.01; // SANGAT PELAN, cuma buat vibe
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}