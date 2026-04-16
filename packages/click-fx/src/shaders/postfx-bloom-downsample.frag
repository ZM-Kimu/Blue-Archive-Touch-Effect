precision highp float;

uniform sampler2D uSourceTexture;
uniform vec2 uSourceTexel;
uniform vec4 uBloomSampleParams;

varying vec2 vUv;

vec4 sampleSource(vec2 uv) {
  return texture2D(uSourceTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec4 sampleLowQuality(vec2 uv) {
  vec2 texel = uSourceTexel;
  vec4 color = sampleSource(uv) * 0.25;
  color += sampleSource(uv + vec2(texel.x, 0.0)) * 0.1875;
  color += sampleSource(uv - vec2(texel.x, 0.0)) * 0.1875;
  color += sampleSource(uv + vec2(0.0, texel.y)) * 0.1875;
  color += sampleSource(uv - vec2(0.0, texel.y)) * 0.1875;
  return color;
}

vec4 sampleHighQuality(vec2 uv) {
  vec2 texel = uSourceTexel;
  vec4 color = sampleSource(uv) * 0.20;
  color += sampleSource(uv + vec2(texel.x, 0.0)) * 0.10;
  color += sampleSource(uv - vec2(texel.x, 0.0)) * 0.10;
  color += sampleSource(uv + vec2(0.0, texel.y)) * 0.10;
  color += sampleSource(uv - vec2(0.0, texel.y)) * 0.10;
  color += sampleSource(uv + texel) * 0.10;
  color += sampleSource(uv - texel) * 0.10;
  color += sampleSource(uv + vec2(texel.x, -texel.y)) * 0.10;
  color += sampleSource(uv + vec2(-texel.x, texel.y)) * 0.10;
  return color;
}

void main() {
  vec4 color = uBloomSampleParams.x < 0.5 ? sampleLowQuality(vUv) : sampleHighQuality(vUv);
  gl_FragColor = vec4(max(color.rgb, vec3(0.0)), clamp(color.a, 0.0, 1.0));
}
