import * as THREE from 'three';

const gridVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const gridFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float gridAlpha = 1.0 - smoothstep(0.0, 0.03, line);

    float dist = length(vWorldPos.xz);
    float fade = smoothstep(15.0, 2.0, dist);

    float pulse = sin(dist * 2.0 - uTime * 1.5) * 0.5 + 0.5;

    float mouseDist = length(vWorldPos.xz - uMouse * 3.0);
    float mouseGlow = smoothstep(4.0, 0.0, mouseDist) * uHover;

    vec3 gridColor = mix(
      vec3(0.05, 0.08, 0.15),
      vec3(0.2, 0.4, 0.9),
      pulse * 0.3
    );
    gridColor += mouseGlow * vec3(0.3, 0.1, 0.6);

    float alpha = gridAlpha * fade * 0.4;
    alpha += mouseGlow * 0.2;

    gl_FragColor = vec4(gridColor, alpha);
  }
`;

export function createEnvironment() {
  const group = new THREE.Group();

  const gridGeometry = new THREE.PlaneGeometry(30, 30, 1, 1);
  gridGeometry.rotateX(-Math.PI / 2);

  const gridMaterial = new THREE.ShaderMaterial({
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const grid = new THREE.Mesh(gridGeometry, gridMaterial);
  grid.position.y = -2.5;
  group.add(grid);

  return { group, material: gridMaterial };
}

export function updateEnvironment(env, time, hover, mouse) {
  env.material.uniforms.uTime.value = time;
  env.material.uniforms.uHover.value = hover;
  env.material.uniforms.uMouse.value.copy(mouse);
}
