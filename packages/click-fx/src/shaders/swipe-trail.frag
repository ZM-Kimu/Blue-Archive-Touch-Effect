precision highp float;

uniform vec3 uTrailStartColor;
uniform vec3 uTrailMidColor;
uniform vec3 uTrailEndColor;
uniform vec4 uTrailParams;
uniform vec4 uTrailAlphaParams;

varying vec2 vUv;
varying float vAge;

const float TRAIL_START_HOLD_END = 1349.0 / 65535.0;
const float TRAIL_TAIL_LENGTH = 0.24;
const float TRAIL_HEAD_LENGTH = 0.26;
const float TRAIL_EDGE_SOFTNESS = 0.08;
const float TRAIL_HEAD_SOFTNESS = 0.12;

vec3 sampleTrailColor(float age) {
  float midTime = clamp(uTrailParams.x, TRAIL_START_HOLD_END + 0.0001, 0.9999);

  if (age <= TRAIL_START_HOLD_END) {
    return uTrailStartColor;
  }

  if (age < midTime) {
    return mix(
      uTrailStartColor,
      uTrailMidColor,
      smoothstep(TRAIL_START_HOLD_END, midTime, age)
    );
  }

  return mix(
    uTrailMidColor,
    uTrailEndColor,
    smoothstep(midTime, 1.0, age)
  );
}

float sampleTrailAlpha(float age) {
  float midTime = clamp(uTrailAlphaParams.w, TRAIL_START_HOLD_END + 0.0001, 0.9999);
  float startAlpha = clamp(uTrailAlphaParams.x, 0.0, 1.0);
  float midAlpha = clamp(uTrailAlphaParams.y, 0.0, 1.0);
  float endAlpha = clamp(uTrailAlphaParams.z, 0.0, 1.0);

  if (age <= TRAIL_START_HOLD_END) {
    return startAlpha;
  }

  if (age < midTime) {
    return mix(
      startAlpha,
      midAlpha,
      smoothstep(TRAIL_START_HOLD_END, midTime, age)
    );
  }

  return mix(
    midAlpha,
    endAlpha,
    smoothstep(midTime, 1.0, age)
  );
}

float sampleTrailShape(vec2 uv) {
  float cross = abs(uv.x - 0.5) * 2.0;
  float tailHalfWidth = clamp(uv.y / TRAIL_TAIL_LENGTH, 0.0, 1.0);
  float bodyMask = 1.0 - smoothstep(tailHalfWidth, tailHalfWidth + TRAIL_EDGE_SOFTNESS, cross);

  float headStart = 1.0 - TRAIL_HEAD_LENGTH;
  if (uv.y <= headStart) {
    return bodyMask;
  }

  vec2 headUv = vec2(
    (uv.x - 0.5) / 0.5,
    (uv.y - headStart) / TRAIL_HEAD_LENGTH
  );
  float headDistance = dot(headUv, headUv);
  float headMask = 1.0 - smoothstep(1.0, 1.0 + TRAIL_HEAD_SOFTNESS, headDistance);
  return bodyMask * headMask;
}

void main() {
  float age = clamp(vAge, 0.0, 1.0);
  float alpha = sampleTrailAlpha(age) * sampleTrailShape(vUv);
  vec3 color = sampleTrailColor(age) * max(uTrailParams.y, 0.0);
  gl_FragColor = vec4(color * alpha, alpha);
}
