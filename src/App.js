import * as THREE from 'three';
import { createScene } from './components/Scene.js';
import { createCamera } from './components/Camera.js';
import { createRenderer } from './components/Renderer.js';
import { createControls } from './components/Controls.js';
import { createSphere, updateSphere, setSphereUniform } from './components/Sphere.js';
import { createParticles, updateParticles } from './components/Particles.js';
import { createEnvironment, updateEnvironment } from './components/Environment.js';
import { createPostProcessing } from './components/PostProcessing.js';

const STATE = {
  IDLE: 'idle',
  HOVER: 'hover',
  EXPLODING: 'exploding',
  POST_EXPLOSION: 'post_explosion',
};

export class App {
  constructor() {
    this.scene = createScene();
    this.camera = createCamera();
    this.renderer = createRenderer();

    this.controls = createControls(this.camera, this.renderer.domElement);

    this.sphere = createSphere();
    this.scene.add(this.sphere);

    this.particles = createParticles(400);
    this.scene.add(this.particles);

    this.environment = createEnvironment();
    this.scene.add(this.environment.group);

    this.postProcessing = createPostProcessing(
      this.renderer,
      this.scene,
      this.camera
    );

    // Interaction state
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.smoothMouse = new THREE.Vector2(-999, -999);
    this.state = STATE.IDLE;
    this.hoverValue = 0;
    this.explosionValue = 0;
    this.distortionValue = 0;
    this.clickTime = -10;
    this.bloomIntensity = 1.5;

    this.clock = new THREE.Clock();
    this.bindEvents();
    this.animate();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mousedown', () => this.onMouseDown());
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchstart', () => this.onMouseDown());
  }

  onMouseMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.sphere);

    if (intersects.length > 0) {
      if (this.state !== STATE.EXPLODING) {
        this.state = STATE.HOVER;
      }
    } else {
      if (this.state === STATE.HOVER) {
        this.state = STATE.IDLE;
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  }

  onMouseDown() {
    if (this.state === STATE.HOVER || this.state === STATE.IDLE) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.sphere);
      if (intersects.length > 0) {
        this.state = STATE.EXPLODING;
        this.clickTime = this.clock.getElapsedTime();
      }
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcessing.resize(w, h);
  }

  updateState(dt) {
    const t = this.clock.getElapsedTime();

    // Smooth mouse
    this.smoothMouse.lerp(this.mouse, 0.1);

    // Hover value
    const targetHover = this.state === STATE.HOVER ? 1.0 : 0.0;
    this.hoverValue += (targetHover - this.hoverValue) * 4.0 * dt;

    // Explosion state machine
    if (this.state === STATE.EXPLODING) {
      const elapsed = t - this.clickTime;
      if (elapsed < 0.1) {
        // Build-up phase
        this.explosionValue += (1.0 - this.explosionValue) * 8.0 * dt;
      } else if (elapsed < 2.0) {
        // Explosion phase - peaks then decays
        const progress = (elapsed - 0.1) / 1.9;
        const curve = Math.sin(progress * Math.PI);
        this.explosionValue += (curve - this.explosionValue) * 6.0 * dt;
      } else {
        // Transition to post
        this.state = STATE.POST_EXPLOSION;
        this.explosionValue += (0 - this.explosionValue) * 3.0 * dt;
      }
    } else if (this.state === STATE.POST_EXPLOSION) {
      this.explosionValue += (0 - this.explosionValue) * 3.0 * dt;
      this.distortionValue += (0.3 - this.distortionValue) * 2.0 * dt;

      if (Math.abs(this.explosionValue) < 0.01 && this.distortionValue > 0.25) {
        this.state = STATE.IDLE;
      }
    } else {
      this.explosionValue += (0 - this.explosionValue) * 4.0 * dt;
      this.distortionValue += (0 - this.distortionValue) * 3.0 * dt;
    }

    // Dynamic bloom
    const targetBloom = 1.5 + this.explosionValue * 4.0 + this.hoverValue * 0.5;
    this.bloomIntensity += (targetBloom - this.bloomIntensity) * 3.0 * dt;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();

    this.updateState(dt);

    // Push uniforms
    setSphereUniform(this.sphere, 'uTime', t);
    setSphereUniform(this.sphere, 'uMouse', this.smoothMouse);
    setSphereUniform(this.sphere, 'uHover', this.hoverValue);
    setSphereUniform(this.sphere, 'uExplosion', this.explosionValue);
    setSphereUniform(this.sphere, 'uDistortion', this.distortionValue);

    updateParticles(this.particles, t, this.hoverValue, this.smoothMouse);
    updateEnvironment(this.environment, t, this.hoverValue, this.smoothMouse);

    this.controls.update();

    // Post-processing
    this.postProcessing.bloomPass.strength = this.bloomIntensity;
    this.postProcessing.chromaticPass.uniforms.uIntensity.value =
      0.3 + this.explosionValue * 2.0 + this.hoverValue * 0.3;
    this.postProcessing.render(t);
  }
}
