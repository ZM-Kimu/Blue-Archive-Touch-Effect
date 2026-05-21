precision highp float;

uniform sampler2D uSceneTexture;
uniform sampler2D uTrailTexture;
uniform vec4 uFinalMixerParams;
uniform float uFinalPreviewMode;

varying vec2 vUv;

vec3 screenBlend(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

float saturate01(float value) {
  return clamp(value, 0.0, 1.0);
}

float unionAlpha(float a, float b) {
  return 1.0 - (1.0 - saturate01(a)) * (1.0 - saturate01(b));
}

vec4 sampleTexture(sampler2D textureSampler) {
  return texture2D(textureSampler, clamp(vUv, vec2(0.0), vec2(1.0)));
}

void main() {
  vec4 sceneSample = sampleTexture(uSceneTexture);
  vec4 trailSample = sampleTexture(uTrailTexture);

  if (uFinalPreviewMode > 1.5) {
    gl_FragColor = trailSample;
    return;
  }

  if (uFinalPreviewMode > 0.5) {
    gl_FragColor = sceneSample;
    return;
  }

  float trailWeight = max(uFinalMixerParams.x, 0.0);
  float mode = uFinalMixerParams.y;
  vec3 weightedTrail = max(trailSample.rgb, vec3(0.0)) * trailWeight;
  vec3 mixed = sceneSample.rgb;

  if (mode < 0.5) {
    mixed += weightedTrail;
  } else if (mode < 1.5) {
    mixed = screenBlend(mixed, weightedTrail);
  } else {
    mixed = max(mixed, weightedTrail);
  }

  float alpha = unionAlpha(sceneSample.a, trailSample.a * clamp(trailWeight, 0.0, 1.0));
  gl_FragColor = vec4(max(mixed, vec3(0.0)), alpha);
}
