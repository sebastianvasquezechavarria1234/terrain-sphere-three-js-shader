<div align="center">

# Terrain Sphere Three.js Shader

An experiment in real-time procedural terrain generation using custom GLSL shaders and Three.js.

A sphere is deformed on the GPU via Simplex noise and Fractal Brownian Motion, with interactive effects triggered by mouse hover and click.

![Preview](img/preview.jpg)

</div>

## About

This is a shader experiment that explores:

- Procedural surface displacement using 3D Simplex noise with 3-octave FBM
- Real-time GPU-side vertex deformation
- Height-based color mapping with smooth gradient transitions
- Interactive feedback through raycasting and shader uniforms
- Directional lighting with wrap, specular, Fresnel rim, and ambient components

The sphere rotates slowly, breathes with a subtle sinusoidal pulsation, and responds to user interaction with ripple and pulse wave effects.

## Features

- **Vertex Shader Displacement** -- Simplex noise FBM drives the terrain shape, with 3 octaves producing smooth rounded deformations on the sphere surface.
- **Fragment Shader Lighting** -- Directional sun with wrap lighting, specular highlights, Fresnel rim, and ambient. Warm and cool color tinting based on lit vs shadow side.
- **Height-Based Color Palette** -- 5-stop gradient mapped to elevation, transitioning from dark tones at low displacement to bright tones at high displacement.
- **Breathing Animation** -- Sinusoidal pulsation along vertex normals driven by elapsed time.
- **Hover Ripple** -- Raycaster detects mouse-over on the sphere, triggering concentric wave ripples that modulate the displacement.
- **Click Pulse** -- Clicking the sphere fires a radial wave pulse that decays over time.
- **Orbit Controls** -- Drag to rotate, scroll to zoom, with damping and constrained distance.

## Tech Stack

| Technology | Purpose |
|---|---|
| Three.js v0.164.1 | 3D rendering (scene, camera, renderer, raycaster, clock) |
| GLSL | Custom vertex and fragment shaders |
| ES Modules | Native browser module loading via import maps |
| OrbitControls | Camera interaction (loaded from CDN) |

No bundler, no `package.json`, no build step. Three.js loads from jsDelivr CDN.

## Project Structure

```
/
|-- index.html                    # Entry point (import map, full-viewport canvas)
|-- img/
|   |-- preview.jpg               # Preview screenshot
|-- src/
    |-- main.js                   # Entry point
    |-- App.js                    # Application loop, events, uniforms
    |-- components/
    |   |-- Camera.js             # Perspective camera factory
    |   |-- Controls.js           # OrbitControls factory
    |   |-- Renderer.js           # WebGL renderer factory
    |   |-- Scene.js              # Scene factory
    |   |-- Sphere.js             # Sphere mesh with ShaderMaterial
    |-- shaders/
        |-- sphereVertex.glsl.js  # Vertex shader (displacement)
        |-- sphereFragment.glsl.js # Fragment shader (lighting + color)
```

## Getting Started

### Prerequisites

- A modern browser with ES module support
- A local HTTP server

### Running

```bash
npx serve .
```

Then open `http://localhost:3000`.

Or use Python:

```bash
python -m http.server
```

Or open `index.html` with VS Code Live Server.

> Opening via `file://` may fail due to CORS restrictions on ES module imports.

## Shader Details

### Vertex Shader

The vertex shader applies four displacement effects in order along the vertex normal:

1. **Breathing** -- `sin(uTime * 0.8) * 0.04`
2. **Terrain** -- FBM noise scaled to 0.3 units, shaped with `pow(mountains, 1.5)`
3. **Hover Ripple** -- `sin(length(pos.xz) * 6.0 - uTime * 3.0) * 0.12` modulated by hover uniform
4. **Click Pulse** -- `sin(length(pos) * 8.0 - uTime * 10.0) * 0.2` modulated by click uniform

### Fragment Shader

Computes lighting and maps elevation to a 5-stop color gradient with smoothstep transitions. Applies warm sun tint on lit side, cool tint on shadow side, plus Fresnel rim and ambient.

### Application Loop

Uses `requestAnimationFrame` with `THREE.Clock`. Smoothly interpolates hover state, decays click pulse, rotates the sphere, pushes 3 uniforms (`uTime`, `uHover`, `uClick`) to the shader, and renders.

## Performance

- Pixel ratio capped at 2
- 128x128 sphere geometry segments
- All terrain computation on the GPU -- CPU passes only 3 float uniforms per frame
- No allocations inside the render loop

## License

MIT License. See [LICENSE](LICENSE) for details.
