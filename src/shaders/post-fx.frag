precision highp float;

uniform sampler2D uSceneTexture;
uniform vec2 uPostResolution;
uniform vec4 uPostParams;
uniform vec2 uPostBloomThresholds;
uniform float uPostEnabled;

varying vec2 vUv;

vec3 screenBlend(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 gaussianBlur(vec2 uv, vec2 direction) {
  vec2 texel = 1.0 / max(uPostResolution, vec2(1.0));
  float radius = max(uPostParams.x, 0.0001);
  vec2 offset1 = direction * texel * 1.38461538 * radius;
  vec2 offset2 = direction * texel * 3.23076923 * radius;

  vec3 color = texture2D(uSceneTexture, uv).rgb * 0.22702703;
  color += texture2D(uSceneTexture, uv + offset1).rgb * 0.31621622;
  color += texture2D(uSceneTexture, uv - offset1).rgb * 0.31621622;
  color += texture2D(uSceneTexture, uv + offset2).rgb * 0.07027027;
  color += texture2D(uSceneTexture, uv - offset2).rgb * 0.07027027;

  return color;
}

vec3 brightPass(vec3 color) {
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float threshold = smoothstep(uPostBloomThresholds.x, uPostBloomThresholds.y, luminance);
  return color * threshold;
}

void main() {
  vec3 base = texture2D(uSceneTexture, vUv).rgb;
  if (uPostEnabled < 0.5) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }

  vec3 blurX = gaussianBlur(vUv, vec2(1.0, 0.0));
  vec3 blurY = gaussianBlur(vUv, vec2(0.0, 1.0));
  vec3 blurLayer = (blurX + blurY) * 0.5;
  float blurMix = uPostParams.y;
  float bloomIntensity = uPostParams.z;
  float screenMix = uPostParams.w;
  vec3 bloomLayer = brightPass(blurLayer) * bloomIntensity + brightPass(base) * (bloomIntensity * 0.35);
  vec3 filtered = clamp(blurLayer * blurMix + bloomLayer, 0.0, 1.0);
  vec3 color = mix(base, screenBlend(base, filtered), screenMix);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
