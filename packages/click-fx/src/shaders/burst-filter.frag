precision highp float;

uniform sampler2D uSceneTexture;
uniform vec2 uSceneUvScale;
uniform vec2 uSceneTexel;
uniform vec4 uPostBloomParams;
uniform float uPostTonemappingMode;

varying vec2 vUv;

vec4 sampleScene(vec2 uv) {
  vec2 scaledUv = clamp(uv * uSceneUvScale, vec2(0.0), uSceneUvScale);
  return texture2D(uSceneTexture, scaledUv);
}

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 brightPass(vec3 color, float threshold) {
  float softStart = max(0.0, threshold - 0.35);
  float mask = smoothstep(softStart, max(threshold, softStart + 0.001), luminance(color));
  return color * mask;
}

vec4 blurBloom(float radius, float threshold) {
  vec2 texel = uSceneTexel * radius;
  vec4 center = sampleScene(vUv);
  vec4 color = vec4(brightPass(center.rgb, threshold), center.a) * 0.24;

  vec4 tap = sampleScene(vUv + vec2(texel.x, 0.0));
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.12;
  tap = sampleScene(vUv - vec2(texel.x, 0.0));
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.12;
  tap = sampleScene(vUv + vec2(0.0, texel.y));
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.12;
  tap = sampleScene(vUv - vec2(0.0, texel.y));
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.12;
  tap = sampleScene(vUv + texel);
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.07;
  tap = sampleScene(vUv - texel);
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.07;
  tap = sampleScene(vUv + vec2(texel.x, -texel.y));
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.07;
  tap = sampleScene(vUv + vec2(-texel.x, texel.y));
  color += vec4(brightPass(tap.rgb, threshold), tap.a) * 0.07;

  return color;
}

vec3 tonemapNeutral(vec3 color) {
  return color / (1.0 + color);
}

vec3 tonemapAces(vec3 color) {
  vec3 mapped = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
  return clamp(mapped, 0.0, 1.0);
}

vec3 applyTonemapping(vec3 color, float mode) {
  if (mode < 0.5) {
    return clamp(color, 0.0, 1.0);
  }

  if (mode < 1.5) {
    return clamp(tonemapNeutral(max(color, vec3(0.0))), 0.0, 1.0);
  }

  return tonemapAces(max(color, vec3(0.0)));
}

void main() {
  vec4 base = sampleScene(vUv);
  float enabled = uPostBloomParams.w;

  if (enabled < 0.5) {
    gl_FragColor = base;
    return;
  }

  float threshold = max(uPostBloomParams.x, 0.0);
  float intensity = max(uPostBloomParams.y, 0.0);
  float scatter = clamp(uPostBloomParams.z, 0.0, 1.0);

  vec4 blurA = blurBloom(mix(0.75, 1.6, scatter), threshold);
  vec4 blurB = blurBloom(mix(1.4, 3.4, scatter), threshold);
  vec4 bloomBlur = mix(blurA, blurB, scatter);
  vec3 bloom = bloomBlur.rgb * intensity;
  vec3 composited = base.rgb + bloom;
  vec3 color = applyTonemapping(composited, uPostTonemappingMode);
  float alpha = clamp(max(base.a, bloomBlur.a * min(1.0, 0.45 + intensity * 0.2)), 0.0, 1.0);

  gl_FragColor = vec4(color, alpha);
}
