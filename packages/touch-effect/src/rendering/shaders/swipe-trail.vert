precision highp float;

attribute vec3 position;
attribute vec3 next;
attribute vec3 prev;
attribute vec2 uv;
attribute float side;
attribute float age;

uniform vec2 uResolution;
uniform float uDPR;
uniform float uThickness;
uniform float uMiter;

varying vec2 vUv;
varying float vAge;

vec4 getPosition() {
  vec4 current = vec4(position, 1.0);
  vec4 nextPos = vec4(next, 1.0);
  vec4 prevPos = vec4(prev, 1.0);

  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 currentScreen = current.xy / current.w * aspect;
  vec2 nextScreen = nextPos.xy / nextPos.w * aspect;
  vec2 prevScreen = prevPos.xy / prevPos.w * aspect;

  vec2 dir1 = normalize(currentScreen - prevScreen);
  vec2 dir2 = normalize(nextScreen - currentScreen);
  vec2 dir = normalize(dir1 + dir2);

  vec2 normal = vec2(-dir.y, dir.x);
  normal /= mix(1.0, max(0.3, dot(normal, vec2(-dir1.y, dir1.x))), uMiter);
  normal /= aspect;

  float pixelWidthRatio = 1.0 / (uResolution.y / max(uDPR, 1.0));
  float pixelWidth = current.w * pixelWidthRatio;
  normal *= pixelWidth * uThickness;
  current.xy -= normal * side;

  return current;
}

void main() {
  vUv = uv;
  vAge = age;
  gl_Position = getPosition();
}
