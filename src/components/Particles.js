import * as THREE from 'three';

const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uHover;
  uniform vec2 uMouse;

  attribute float aScale;
  attribute float aSpeed;
  attribute float aOffset;

  varying float vAlpha;
  varying float vHover;

  void main() {
    vec3 pos = position;

    float t = uTime * aSpeed + aOffset;

    pos.x += sin(t * 0.5) * 0.3;
    pos.y += cos(t * 0.7) * 0.3;
    pos.z += sin(t * 0.3 + aOffset) * 0.5;

    pos.x += sin(t * 1.2 + pos.y * 2.0) * 0.1;
    pos.y += cos(t * 0.8 + pos.x * 2.0) * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float distToMouse = length(pos.xy - vec3(uMouse, 0.0).xy);
    float mousePush = smoothstep(2.0, 0.0, distToMouse) * uHover;
    pos += normalize(pos) * mousePush * 0.5;

    mvPosition = modelViewMatrix * vec4(pos, 1.0);

    vAlpha = smoothstep(100.0, 10.0, -mvPosition.z) * (0.3 + aScale * 0.7);
    vAlpha *= 0.6 + sin(t * 3.0) * 0.4;
    vHover = mousePush;

    gl_PointSize = aScale * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vHover;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 2.0);

    vec3 baseColor = vec3(0.4, 0.6, 1.0);
    vec3 hoverColor = vec3(0.8, 0.4, 1.0);
    vec3 color = mix(baseColor, hoverColor, vHover);

    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    color += core * vec3(0.5);

    gl_FragColor = vec4(color, glow * vAlpha);
  }
`;

export function createParticles(count = 300) {
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const speeds = new Float32Array(count);
  const offsets = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.5 + Math.random() * 3.0;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    scales[i] = Math.random() * 1.5 + 0.5;
    speeds[i] = Math.random() * 0.5 + 0.2;
    offsets[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  return points;
}

export function updateParticles(particles, time, hover, mouse) {
  particles.material.uniforms.uTime.value = time;
  particles.material.uniforms.uHover.value = hover;
  particles.material.uniforms.uMouse.value.copy(mouse);
}
