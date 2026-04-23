// shaders
export const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const fragmentShader = `
    uniform sampler2D map;    
    uniform float imageAspect, planeAspect, glitchIntensity, time;
    uniform vec2 iResolution;
    varying vec2 vUv;

    // Fungsi hash untuk random noise
    float hash(float n) {
      return fract(sin(n) * 43758.5453123);
    }

    // Perbaikan: Menambahkan semicolon (;) dan logika penanganan UV
    vec2 coverUv(vec2 uv) {
      vec2 newUv = uv;
      if (planeAspect > imageAspect) {
        float s = imageAspect / planeAspect;
        newUv.y = uv.y * s + (1.0 - s) * 0.5;
      } else {
        float s = planeAspect / imageAspect;
        newUv.x = uv.x * s + (1.0 - s) * 0.5;
      }
      return newUv; // Menambahkan semicolon yang tadi hilang
    }

    void main() {
        vec2 uv = fract(vUv);
        float gi = glitchIntensity;
        
        // Glitch Offset (Horizontal & Vertical)
        uv.x += (hash(floor(uv.y * 20.0 + time * 80.0) + time * 7.0) - 0.5) * 2.0 * gi * 0.15;
        uv.y += (hash(floor(time * 50.0)) - 0.5) * gi * 0.06;

        float rs = 0.001 + gi * 0.025;
        
        // Chromatic Aberration & Texture Sampling
        vec3 col;
        col.r = texture2D(map, coverUv(vec2(uv.x + rs, uv.y + rs))).r + 0.05;
        col.g = texture2D(map, coverUv(vec2(uv.x, uv.y - rs * 2.0))).g + 0.05;
        col.b = texture2D(map, coverUv(vec2(uv.x - rs * 2.0, uv.y))).b + 0.05;

        // Ghosting / Color Bleeding
        col.r += 0.08 * texture2D(map, coverUv(vec2(uv.x + 0.025, uv.y - 0.026))).r;
        col.g += 0.05 * texture2D(map, coverUv(vec2(uv.x - 0.022, uv.y - 0.022))).g;
        col.b += 0.08 * texture2D(map, coverUv(vec2(uv.x - 0.022, uv.y - 0.018))).b;

        // Contrast & Vignette
        col = clamp(col * 0.93 + 0.07 * col * col, 0.0, 1.0);
        
        // Cari bagian Vignette dan ganti uv-nya dengan fract(vUv)
        float vignette = pow(16.0 * fract(vUv).x * fract(vUv).y * (1.0 - fract(vUv).x) * (1.0 - fract(vUv).y), 0.12);
        col *= vec3(vignette);
        
        // Color Tint
        col *= vec3(0.95, 1.05, 0.95) * 2.5;
        
        // Scanlines Effect
        col *= vec3(0.6 + 0.4 * pow(clamp(0.35 + 0.35 * sin(uv.y * iResolution.y * 1.5), 0.0, 1.0), 1.2));
        
        // Vertical Strip (RGB Pattern)
        col *= 1.0 - 0.65 * vec3(clamp((mod(vUv.x * iResolution.x, 2.0) - 1.0) * 2.0, 0.0, 1.0));
        
        // Grain / Static Noise
        // Perbaikan: Menambahkan semicolon (;) yang tadi hilang
        col += vec3(hash(uv.x * 100.0 + uv.y * 1000.0 + time * 300.0) * gi * 0.3);

        gl_FragColor = vec4(col, 1.0);
    }
`;
