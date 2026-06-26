export const sphereVertexShader = /* glsl */ `
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

  // --- Noise utilities ---
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

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vUv = uv;
    vExplosion = uExplosion;
    vHover = uHover;
    vDistortion = uDistortion;

    vec3 pos = position;

    // --- Layer 1: Organic breathing (multi-octave FBM) ---
    float breath = fbm(pos * 1.5 + uTime * 0.3) * 0.08;
    pos += normal * breath;

    // --- Layer 2: Surface detail ripples ---
    float ripple = sin(pos.x * 8.0 + uTime * 1.2)
                 * sin(pos.y * 8.0 + uTime * 0.9)
                 * sin(pos.z * 8.0 + uTime * 1.1);
    pos += normal * ripple * 0.02 * (1.0 + uDistortion * 2.0);

    // --- Layer 3: Mouse magnetic attraction ---
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vec3 mouseDir = normalize(worldPos.xyz - vec3(uMouse * 3.0, 0.0));
    float mouseDist = length(worldPos.xyz - vec3(uMouse * 3.0, 0.0));
    float attraction = smoothstep(3.0, 0.0, mouseDist) * uHover;

    // Magnetic pull toward mouse
    pos -= mouseDir * attraction * 0.3;

    // Surface deformation at mouse point
    float deform = smoothstep(1.5, 0.0, mouseDist) * uHover;
    pos += normal * deform * sin(uTime * 8.0) * 0.08;

    // --- Layer 4: Explosion fragmentation ---
    float expNoise1 = fbm(pos * 2.0 + uTime * 3.0);
    float expNoise2 = snoise(pos * 4.0 + uTime * 5.0);
    float expNoise3 = snoise(normal * 3.0 + uTime * 2.0);

    // Main explosion force
    float expForce = uExplosion * (1.0 + expNoise1 * 0.6);
    pos += normal * expForce * (0.5 + abs(expNoise2) * 0.8);

    // Radial scatter
    vec3 scatterDir = normalize(pos + vec3(expNoise2, expNoise1, expNoise3));
    pos += scatterDir * uExplosion * abs(expNoise3) * 0.4;

    // Chunks breaking off
    float chunk = step(0.6, snoise(pos * 3.0 + uTime * 4.0));
    pos += normal * chunk * uExplosion * 0.6;

    // --- Layer 5: Post-explosion distortion ---
    float postExp = uDistortion;
    float postNoise = fbm(pos * 2.0 + uTime);
    pos += normal * postNoise * postExp * 0.15;

    vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
