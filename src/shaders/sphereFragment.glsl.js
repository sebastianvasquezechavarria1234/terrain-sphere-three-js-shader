export const sphereFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uExplosion;
  uniform float uDistortion;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vExplosion;
  varying float vHover;
  varying float vDistortion;

  // --- Noise for fragment ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // --- Multi-light setup ---
    vec3 lightDir1 = normalize(vec3(2.0, 3.0, 1.0));
    vec3 lightDir2 = normalize(vec3(-1.0, -0.5, 2.0));
    vec3 lightColor1 = vec3(0.6, 0.7, 1.0);
    vec3 lightColor2 = vec3(0.9, 0.5, 0.3);

    float diff1 = max(dot(vNormal, lightDir1), 0.0);
    float diff2 = max(dot(vNormal, lightDir2), 0.0);
    vec3 diffuse = diff1 * lightColor1 * 0.5 + diff2 * lightColor2 * 0.3;

    // --- Specular (GGX-inspired) ---
    vec3 halfDir1 = normalize(lightDir1 + viewDir);
    vec3 halfDir2 = normalize(lightDir2 + viewDir);
    float spec1 = pow(max(dot(vNormal, halfDir1), 0.0), 64.0);
    float spec2 = pow(max(dot(vNormal, halfDir2), 0.0), 32.0);
    vec3 specular = spec1 * lightColor1 * 0.8 + spec2 * lightColor2 * 0.4;

    // --- Fresnel ---
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 4.0);

    // --- Iridescence ---
    float angle = dot(viewDir, vNormal);
    vec3 iridescence = vec3(
      0.5 + 0.5 * cos(angle * 6.28 + 0.0),
      0.5 + 0.5 * cos(angle * 6.28 + 2.09),
      0.5 + 0.5 * cos(angle * 6.28 + 4.18)
    );

    // --- Base color with depth ---
    vec3 deepColor = vec3(0.02, 0.05, 0.15);
    vec3 surfaceColor = vec3(0.15, 0.25, 0.6);
    vec3 accentColor = vec3(0.5, 0.2, 0.8);
    vec3 energyColor = vec3(0.3, 0.8, 1.0);

    float depthFactor = smoothstep(-1.0, 1.0, vNormal.y);
    vec3 baseColor = mix(deepColor, surfaceColor, depthFactor);

    // Add iridescence
    baseColor = mix(baseColor, iridescence * 0.6, fresnel * 0.5);

    // Combine lighting
    vec3 color = baseColor;
    color += diffuse;
    color += specular;
    color += fresnel * accentColor * 0.8;
    color += fresnel * fresnel * energyColor * 0.4;

    // --- Hover effect: energy field ---
    float hoverWave = sin(vWorldPosition.x * 10.0 + uTime * 5.0)
                    * sin(vWorldPosition.y * 10.0 + uTime * 4.0)
                    * sin(vWorldPosition.z * 10.0 + uTime * 6.0);
    vec3 hoverEnergy = vec3(0.4, 0.1, 0.9) * hoverWave * vHover * 0.5;

    float hoverFresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
    hoverEnergy += hoverFresnel * vHover * vec3(0.6, 0.2, 1.0) * 1.2;

    // Pulsing rings at hover point
    float ringDist = length(vWorldPosition.xy - vec3(uMouse * 3.0, 0.0).xy);
    float rings = sin(ringDist * 15.0 - uTime * 8.0) * 0.5 + 0.5;
    rings *= smoothstep(3.0, 0.0, ringDist) * vHover;
    hoverEnergy += rings * vec3(0.5, 0.3, 1.0) * 0.8;

    color += hoverEnergy;

    // --- Explosion: molten core ---
    vec3 magmaDark = vec3(0.6, 0.05, 0.0);
    vec3 magmaBright = vec3(1.0, 0.6, 0.1);
    vec3 lavaHot = vec3(1.0, 0.9, 0.4);

    float expFresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);
    float expPattern = snoise(vWorldPosition * 4.0 + uTime * 3.0) * 0.5 + 0.5;

    vec3 explosionColor = mix(magmaDark, magmaBright, expPattern);
    explosionColor = mix(explosionColor, lavaHot, expFresnel * 0.6);

    color = mix(color, explosionColor, vExplosion * 0.85);

    // Eruption cracks
    float crack = snoise(vWorldPosition * 12.0 + uTime * 6.0);
    crack = smoothstep(0.3, 0.5, abs(crack));
    color += vExplosion * crack * lavaHot * 0.8;

    // Inner glow
    color += vExplosion * fresnel * vec3(1.0, 0.7, 0.2) * 2.5;

    // Explosion rim
    color += vExplosion * expFresnel * vec3(1.0, 0.3, 0.05) * 3.0;

    // --- Post-distortion shimmer ---
    float shimmer = snoise(vWorldPosition * 8.0 + uTime * 2.0);
    color += uDistortion * shimmer * vec3(0.1, 0.2, 0.4) * 0.3;

    // --- Subtle scan lines for tech feel ---
    float scanline = sin(vWorldPosition.y * 80.0 + uTime * 3.0) * 0.5 + 0.5;
    color *= 1.0 - scanline * 0.04;

    // --- Tone mapping (Reinhard) ---
    color = color / (color + vec3(1.0));

    // Slight color grade
    color = pow(color, vec3(0.95, 1.0, 1.05));

    gl_FragColor = vec4(color, 1.0);
  }
`;
