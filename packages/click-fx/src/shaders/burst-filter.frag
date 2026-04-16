precision highp float;

uniform sampler2D uSceneTexture;
uniform sampler2D uBloomTexture;
uniform vec4 uPostfxParams;
uniform vec4 uPostfxAlphaParams;
uniform vec3 uBloomTint;

varying vec2 vUv;

vec4 sampleScene(vec2 uv) {
  return texture2D(uSceneTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec4 sampleBloom(vec2 uv) {
  return texture2D(uBloomTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec3 neutralCurve(vec3 x, float a, float b, float c, float d, float e, float f) {
  return ((x * (a * x + c * b) + d * e) / (x * (a * x + b) + d * f)) - e / f;
}

vec3 tonemapNeutral(vec3 color) {
  vec3 safeColor = max(color, vec3(0.0));
  const float a = 0.2;
  const float b = 0.29;
  const float c = 0.24;
  const float d = 0.272;
  const float e = 0.02;
  const float f = 0.3;
  const float whiteLevel = 5.3;
  vec3 whiteScale = vec3(1.0) / neutralCurve(vec3(whiteLevel), a, b, c, d, e, f);
  vec3 mapped = neutralCurve(safeColor * whiteScale, a, b, c, d, e, f);
  return mapped * whiteScale;
}

vec3 tonemapAces(vec3 color) {
  vec3 safeColor = max(color, vec3(0.0));
  vec3 mapped = (safeColor * (safeColor + 0.0245786) - 0.000090537) /
    (safeColor * (0.983729 * safeColor + 0.4329510) + 0.238081);
  return clamp(mapped, 0.0, 1.0);
}

vec3 applyTonemapping(vec3 color, float mode) {
  if (mode < 0.5) {
    return max(color, vec3(0.0));
  }

  if (mode < 1.5) {
    return clamp(tonemapNeutral(color), 0.0, 1.0);
  }

  return tonemapAces(color);
}

void main() {
  vec4 sceneSample = sampleScene(vUv);

  if (uPostfxParams.x < 0.5) {
    gl_FragColor = sceneSample;
    return;
  }

  vec4 bloomSample = uPostfxParams.y < 0.5 ? vec4(0.0) : sampleBloom(vUv);
  vec3 bloom = bloomSample.rgb * uBloomTint * max(uPostfxParams.z, 0.0);
  float bloomAlpha = clamp(bloomSample.a * uPostfxAlphaParams.x, 0.0, uPostfxAlphaParams.y);
  float alpha = 1.0 - (1.0 - clamp(sceneSample.a, 0.0, 1.0)) * (1.0 - bloomAlpha);
  vec3 premultColor = max(sceneSample.rgb + bloom, vec3(0.0));
  vec3 straightColor = alpha > 0.00001 ? premultColor / alpha : vec3(0.0);
  vec3 color = applyTonemapping(straightColor, uPostfxParams.w) * alpha;

  gl_FragColor = vec4(color, alpha);
}
