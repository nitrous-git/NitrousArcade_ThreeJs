export const arenaVertex = /* glsl */`
varying vec2 vPosition;
void main() { vPosition = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
`;
export const arenaFragment = /* glsl */`
precision highp float;
varying vec2 vPosition;
uniform float uTime;
uniform float uEnergy;
void main() {
  vec2 p = vPosition;
  vec2 grid = abs(fract(p - .5) - .5) / max(fwidth(p), vec2(.001));
  float line = 1. - min(min(grid.x, grid.y), 1.);
  float vignette = exp(-length(p * vec2(.075, .07)) * 1.6);
  float sweep = pow(.5 + .5 * sin(p.y * .6 - uTime * .35), 12.);
  vec3 base = mix(vec3(.012, .021, .032), vec3(.024, .052, .063), vignette);
  base += line * vec3(.017, .038, .043) * (.5 + vignette);
  base += sweep * vignette * vec3(.004, .013, .012);
  base += uEnergy * .025 * vec3(.2, .9, .7) * vignette;
  gl_FragColor = vec4(base, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
export const particleVertex = /* glsl */`
attribute vec3 tint;
attribute float size;
attribute float opacity;
varying vec3 vTint;
varying float vOpacity;
uniform float uScale;
void main() {
  vTint = tint; vOpacity = opacity;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  gl_PointSize = max(1., size * uScale);
}
`;
export const particleFragment = /* glsl */`
varying vec3 vTint;
varying float vOpacity;
void main() {
  float r = length(gl_PointCoord - .5) * 2.;
  if (r > 1. || vOpacity < .001) discard;
  float a = pow(1. - r, 1.8) * vOpacity;
  gl_FragColor = vec4(vTint * 2., a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
