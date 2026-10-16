export const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
export const fragmentShader = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPulseOrigin;
  uniform float uPulseAge;
  void main() {
    vec2 p = (vUv - 0.5) * 28.0;
    vec2 cell = abs(fract(p - 0.5) - 0.5) / max(fwidth(p), vec2(0.001));
    float grid = 1.0 - min(min(cell.x, cell.y), 1.0);
    float fade = exp(-length(p) * 0.115);
    float ringDistance = abs(length(p - uPulseOrigin) - uPulseAge * 8.0);
    float ring = exp(-ringDistance * ringDistance * 7.0) * max(0.0, 1.0 - uPulseAge / 2.0);
    float breath = 0.9 + 0.1 * sin(uTime * 0.5);
    vec3 color = vec3(0.008, 0.018, 0.03) + vec3(0.03, 0.13, 0.17) * grid * fade * breath;
    color += vec3(0.12, 1.1, 0.85) * ring * fade;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
