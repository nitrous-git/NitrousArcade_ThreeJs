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

    // Stable, anti-aliased procedural grid.
    vec2 distanceToGrid = abs(fract(p - 0.5) - 0.5);
    vec2 aa = max(fwidth(p), vec2(0.001));

    float gridX = 1.0 - smoothstep(
        0.012, 0.012 + aa.x * 1.5, distanceToGrid.x
    );

    float gridY = 1.0 - smoothstep(
        0.012, 0.012 + aa.y * 1.5, distanceToGrid.y
    );

    float line = max(gridX, gridY);

    // Static ambient vignette.
    float vignette = exp(
        -length(p * vec2(0.075, 0.07)) * 1.6
    );

    // Dark teal arena palette.
    vec3 base = mix(
        vec3(0.012, 0.021, 0.032),
        vec3(0.024, 0.052, 0.063),
        vignette
    );

    // Stable grid illumination.
    base += line
        * vec3(0.017, 0.038, 0.043)
        * (0.5 + vignette);

    gl_FragColor = vec4(base, 1.0);

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
