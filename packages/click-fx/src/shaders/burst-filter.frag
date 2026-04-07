precision highp float;

uniform sampler2D uSceneTexture;
uniform vec2 uSceneUvScale;
uniform vec2 uSceneTexel;
uniform vec4 uPostParams;
uniform vec2 uPostBloomThresholds;
uniform float uPostBlendMode;
uniform float uPostGlobalAlpha;
uniform float uPostEnabled;

varying vec2 vUv;

vec4 sampleScene(vec2 uv) {
  vec2 scaledUv = clamp(uv * uSceneUvScale, vec2(0.0), uSceneUvScale);
  return texture2D(uSceneTexture, scaledUv);
}

vec3 screenBlend(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blendLayer(vec3 dst, vec3 src, float alpha, float mode) {
  float mixAlpha = clamp(alpha, 0.0, 1.0);
  vec3 clampedSrc = clamp(src, 0.0, 1.0);

  if (mode < 0.5) {
    return mix(dst, clampedSrc, mixAlpha);
  }

  if (mode < 1.5) {
    return dst + clampedSrc * mixAlpha;
  }

  return mix(dst, screenBlend(clamp(dst, 0.0, 1.0), clampedSrc), mixAlpha);
}

vec3 brightPass(vec3 color) {
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float threshold = smoothstep(uPostBloomThresholds.x, uPostBloomThresholds.y, luminance);
  return color * threshold;
}

vec4 blurSample(float radius) {
  vec2 texel = uSceneTexel * radius;
  vec4 color = sampleScene(vUv) * 0.24;
  color += sampleScene(vUv + vec2(texel.x, 0.0)) * 0.12;
  color += sampleScene(vUv - vec2(texel.x, 0.0)) * 0.12;
  color += sampleScene(vUv + vec2(0.0, texel.y)) * 0.12;
  color += sampleScene(vUv - vec2(0.0, texel.y)) * 0.12;
  color += sampleScene(vUv + texel) * 0.07;
  color += sampleScene(vUv - texel) * 0.07;
  color += sampleScene(vUv + vec2(texel.x, -texel.y)) * 0.07;
  color += sampleScene(vUv + vec2(-texel.x, texel.y)) * 0.07;
  return color;
}

void main() {
  vec4 base = sampleScene(vUv);

  if (uPostEnabled < 0.5) {
    gl_FragColor = base;
    return;
  }

  float blurRadius = max(uPostParams.x, 0.01);
  float blurMix = uPostParams.y;
  float bloomIntensity = uPostParams.z;
  float screenMix = uPostParams.w;

  vec4 narrowBlur = blurSample(blurRadius);
  vec4 wideBlur = blurSample(blurRadius * 1.9);
  vec4 blurred = mix(narrowBlur, wideBlur, clamp(blurMix, 0.0, 1.0));

  vec3 brightBase = brightPass(base.rgb);
  vec3 brightBlur = brightPass(blurred.rgb);
  vec3 bloomLayer = mix(brightBase, brightBlur, blurMix) * bloomIntensity;
  vec3 filtered = clamp(blurred.rgb + bloomLayer, 0.0, 1.0);
  vec3 color = blendLayer(base.rgb, filtered, screenMix, uPostBlendMode) * clamp(uPostGlobalAlpha, 0.0, 1.0);
  float alpha = clamp(max(base.a, blurred.a), 0.0, 1.0) * clamp(uPostGlobalAlpha, 0.0, 1.0);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha);
}
