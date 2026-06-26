import * as THREE from 'three';
import { sphereVertexShader } from '../shaders/sphereVertex.glsl.js';
import { sphereFragmentShader } from '../shaders/sphereFragment.glsl.js';

export function createSphere() {
  const geometry = new THREE.SphereGeometry(1, 128, 128);

  const material = new THREE.ShaderMaterial({
    vertexShader: sphereVertexShader,
    fragmentShader: sphereFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
      uExplosion: { value: 0 },
      uDistortion: { value: 0 },
    },
    side: THREE.FrontSide,
  });

  const sphere = new THREE.Mesh(geometry, material);
  return sphere;
}

export function updateSphere(sphere, elapsedTime) {
  sphere.material.uniforms.uTime.value = elapsedTime;
}

export function setSphereUniform(sphere, name, value) {
  if (sphere.material.uniforms[name]) {
    sphere.material.uniforms[name].value = value;
  }
}
