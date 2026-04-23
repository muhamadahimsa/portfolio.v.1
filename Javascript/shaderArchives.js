export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  uniform sampler2D map;
  uniform float time;
  uniform float glitchIntensity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    float gi = glitchIntensity;

    // 1. DISTORSI BLOCKY (Khas TV Rusak)
    if(gi > 0.0) {
        float blockNoise = hash(vec2(floor(uv.y * 10.0), floor(time * 8.0)));
        float lineNoise = hash(vec2(floor(uv.y * 100.0), time));
        
        // Geser UV secara horizontal berdasarkan noise
        uv.x += (blockNoise - 0.5) * gi * 0.08;
        uv.x += (lineNoise - 0.5) * gi * 0.02;
    }

    // 2. CHROMATIC ABERRATION (RGB Split)
    // Kita ambil warna R, G, dan B dari koordinat UV yang sedikit berbeda
    float shift = gi * 0.03;
    float r = texture2D(map, uv + vec2(shift, 0.0)).r;
    float g = texture2D(map, uv).g;
    float b = texture2D(map, uv - vec2(shift, 0.0)).b;
    vec3 texColor = vec3(r, g, b);

    // 3. EFEK VISUAL "KEMRESEK"
    // Static Noise kasar
    float staticNoise = (hash(uv + time) - 0.5) * gi * 0.5;
    
    // Scanlines yang lebih gelap dan kontras
    float scanline = sin(uv.y * 1000.0 + time * 10.0) * 0.1 * gi;
    
    // Vignette (biar pinggirnya gelap, makin dapet vibe analognya)
    float vignette = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y) * 15.0;
    vignette = pow(vignette, 0.2);

    // Campur semua efek
    vec3 effects = texColor + staticNoise - scanline;
    effects *= mix(1.0, vignette, gi); // Vignette cuma muncul pas glitch

    // 4. FINAL MIX & DARKENING
    // Pas gi = 0 (Hovered), video jernih. Pas gi > 0 (Others), video kemresek & gelap.
    vec3 finalColor = mix(texColor, effects, gi);
    
    // Bikin video yang kena glitch lebih gelap (Low Exposure)
    float brightness = mix(1.0, 0.4, gi); 
    
    gl_FragColor = vec4(finalColor * brightness, 1.0);
  }
`;