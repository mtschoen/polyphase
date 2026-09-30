export const atmosphereVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const atmosphereFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform float uIntensity;
uniform float uBurst;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uVoid;
varying vec2 vUv;

float noiseHash(vec2 position) {
  return fract(sin(dot(position, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 position) {
  vec2 cell = floor(position);
  vec2 fraction = fract(position);
  fraction = fraction * fraction * (3.0 - 2.0 * fraction);
  return mix(
    mix(noiseHash(cell), noiseHash(cell + vec2(1.0, 0.0)), fraction.x),
    mix(noiseHash(cell + vec2(0.0, 1.0)), noiseHash(cell + vec2(1.0)), fraction.x),
    fraction.y
  );
}

float nebula(vec2 position) {
  return noise(position) * 0.57
    + noise(position * 2.04 + vec2(13.7, 9.2)) * 0.28
    + noise(position * 4.13 + vec2(4.8, 17.4)) * 0.15;
}

void main() {
  vec2 position = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
  float time = uTime * 0.045;
  float response = uIntensity * 0.1 + uBurst * 0.3;
  float cloud = nebula(position * 1.45 + vec2(time * 0.19, -time * 0.12));
  float lowerGlow = exp(-length((position - vec2(-0.45, -0.8)) * vec2(0.55, 1.1)));
  vec3 color = uVoid + uPrimary * (0.006 + cloud * 0.013) * lowerGlow;
  color += uSecondary * 0.006 * exp(-length(position - vec2(1.3, 0.3)) * 1.5);

  // A tilted orbit frames the board, with a deliberately quiet interior.
  float tilt = 0.30 + sin(time * 0.23) * 0.018;
  mat2 rotation = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt));
  vec2 orbit = rotation * (position - vec2(0.0, 0.08));
  orbit /= vec2(1.28, 0.66) * (1.0 + uBurst * 0.025);
  float orbitRadius = length(orbit);
  float distanceToOrbit = abs(orbitRadius - 1.0);
  float angle = atan(orbit.y, orbit.x);
  float highlight = pow(0.5 + 0.5 * sin(angle + time * 0.18), 5.0);
  float orbitCore = exp(-distanceToOrbit * 290.0);
  float orbitGlow = exp(-distanceToOrbit * 38.0);
  float orbitHaze = exp(-distanceToOrbit * 10.0);
  vec3 orbitColor = mix(uPrimary, uSecondary, smoothstep(-0.6, 0.8, sin(angle - 0.9)));
  color += orbitColor * (
    orbitCore * (0.27 + highlight * 0.43)
    + orbitGlow * 0.10
    + orbitHaze * 0.028
  ) * (1.0 + response);
  color += uPrimary * exp(-abs(orbitRadius - 1.045) * 240.0) * 0.025;

  // Layered silk-like ribbons stay low enough to support legible gameplay.
  float ribbonLight = 0.0;
  float ribbonMist = 0.0;
  for (int i = 0; i < 4; i++) {
    float layer = float(i);
    float curve = -0.78 + layer * 0.065;
    curve += sin(position.x * (1.65 + layer * 0.12) + time * 0.47 + layer * 0.6) * 0.105;
    curve += sin(position.x * 3.0 - time * 0.36 + layer) * 0.035;
    float distanceToRibbon = abs(position.y - curve);
    float curtain = 0.58 + 0.42 * sin(position.x * 1.9 + layer * 0.8 + time * 0.2);
    ribbonLight += exp(-distanceToRibbon * (36.0 + layer * 8.0)) * curtain * 0.048;
    ribbonMist += exp(-distanceToRibbon * 8.0) * curtain * 0.023;
  }
  vec3 ribbonColor = mix(uPrimary, uSecondary, smoothstep(-0.9, 1.4, position.x));
  color += ribbonColor * (ribbonLight + ribbonMist) * (1.0 + response * 0.75);
  color += uPrimary * 0.017 * exp(-abs(position.y + 0.95) * 5.0);

  float quietCenter = exp(-dot(position * vec2(2.4, 1.1), position * vec2(2.4, 1.1)) * 1.4);
  color *= 1.0 - quietCenter * 0.36;
  float vignette = 1.0 - smoothstep(0.2, 1.6, length(vUv - 0.5) * 1.5);
  color *= mix(0.5, 1.0, vignette);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const starsVertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aPhase;
attribute float aMote;
varying float vOpacity;
varying float vMote;

void main() {
  vec3 pointPosition = position;
  pointPosition.x += sin(uTime * 0.035 + aPhase) * (0.004 + aMote * 0.025);
  pointPosition.y += cos(uTime * 0.045 + aPhase * 2.0) * (0.006 + aMote * 0.045);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pointPosition, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  float breathing = 0.86 + 0.14 * sin(uTime * 0.35 + aPhase);
  float centerFade = smoothstep(0.22, 0.8, length(position.xy * vec2(1.4, 0.7)));
  vOpacity = breathing * centerFade * mix(0.38, 0.14, aMote);
  vMote = aMote;
}
`;

export const starsFragmentShader = /* glsl */ `
uniform vec3 uPrimary;
uniform vec3 uSecondary;
varying float vOpacity;
varying float vMote;

void main() {
  float radius = length(gl_PointCoord - vec2(0.5));
  float glow = exp(-radius * radius * mix(22.0, 12.0, vMote));
  float edge = 1.0 - smoothstep(0.35, 0.5, radius);
  vec3 color = mix(vec3(0.74, 0.86, 0.9), mix(uPrimary, uSecondary, 0.3), vMote);
  gl_FragColor = vec4(color, glow * edge * vOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
