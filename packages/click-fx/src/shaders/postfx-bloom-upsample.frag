precision highp float;

uniform sampler2D uHighTexture;
uniform sampler2D uLowTexture;
uniform vec2 uLowTexel;
uniform vec4 uBloomUpsampleParams;

varying vec2 vUv;

vec4 sampleHigh(vec2 uv) {
  return texture2D(uHighTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec4 sampleLow(vec2 uv) {
  return texture2D(uLowTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec4 sampleLowTent(vec2 uv, float radius, float highQuality) {
  vec2 texel = uLowTexel * radius;
  vec4 center = sampleLow(uv) * (highQuality < 0.5 ? 0.36 : 0.24);
  vec4 color = center;
  color += sampleLow(uv + vec2(texel.x, 0.0)) * (highQuality < 0.5 ? 0.16 : 0.12);
  color += sampleLow(uv - vec2(texel.x, 0.0)) * (highQuality < 0.5 ? 0.16 : 0.12);
  color += sampleLow(uv + vec2(0.0, texel.y)) * (highQuality < 0.5 ? 0.16 : 0.12);
  color += sampleLow(uv - vec2(0.0, texel.y)) * (highQuality < 0.5 ? 0.16 : 0.12);

  if (highQuality >= 0.5) {
    color += sampleLow(uv + texel) * 0.07;
    color += sampleLow(uv - texel) * 0.07;
    color += sampleLow(uv + vec2(texel.x, -texel.y)) * 0.07;
    color += sampleLow(uv + vec2(-texel.x, texel.y)) * 0.07;
  }

  return color;
}

void main() {
  float scatter = clamp(uBloomUpsampleParams.x, 0.05, 0.95);
  float radius = mix(0.6, 1.9, scatter);
  float highQuality = uBloomUpsampleParams.y;
  vec4 high = sampleHigh(vUv);
  vec4 low = sampleLowTent(vUv, radius, highQuality);
  vec4 combined = max(high + low, 0.0);
  gl_FragColor = vec4(combined.rgb, clamp(high.a + low.a, 0.0, 1.0));
}
