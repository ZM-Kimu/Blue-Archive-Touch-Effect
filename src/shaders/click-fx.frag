precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;

varying vec2 vUv;

vec3 palette(float t) {
  vec3 a = vec3(0.03, 0.07, 0.12);
  vec3 b = vec3(0.16, 0.28, 0.36);
  vec3 c = vec3(0.23, 0.84, 1.0);
  return mix(a + b * t, c, smoothstep(0.75, 1.0, t));
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 uv = (vUv - 0.5) * aspect;
  vec2 pointer = (uPointer - 0.5) * aspect;
  float dist = length(uv - pointer);

  float pulse = exp(-10.0 * dist) * (0.65 + 0.35 * sin(uTime * 2.2));
  float halo = smoothstep(0.42, 0.0, dist) * 0.22;
  float grid = 0.5 + 0.5 * sin((uv.x + uv.y + uTime * 0.08) * 34.0);
  float shade = pulse + halo + grid * 0.025;

  vec3 color = palette(clamp(shade, 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
}
