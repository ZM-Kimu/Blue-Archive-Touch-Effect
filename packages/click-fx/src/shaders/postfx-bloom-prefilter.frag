precision highp float;

uniform sampler2D uSourceTexture;
uniform vec2 uSourceTexel;
uniform vec4 uBloomThresholdData;

varying vec2 vUv;

vec4 sampleSource(vec2 uv) {
  return texture2D(uSourceTexture, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec4 samplePrefilterSource(vec2 uv) {
  if (uBloomThresholdData.w < 0.5) {
    return sampleSource(uv);
  }

  vec2 texel = uSourceTexel;
  vec4 color = sampleSource(uv) * 0.25;
  color += sampleSource(uv + vec2(texel.x, 0.0)) * 0.125;
  color += sampleSource(uv - vec2(texel.x, 0.0)) * 0.125;
  color += sampleSource(uv + vec2(0.0, texel.y)) * 0.125;
  color += sampleSource(uv - vec2(0.0, texel.y)) * 0.125;
  color += sampleSource(uv + texel) * 0.0625;
  color += sampleSource(uv - texel) * 0.0625;
  color += sampleSource(uv + vec2(texel.x, -texel.y)) * 0.0625;
  color += sampleSource(uv + vec2(-texel.x, texel.y)) * 0.0625;
  return color;
}

vec3 prefilterColor(vec3 color, float threshold, float knee, float clampValue) {
  vec3 limited = min(color, vec3(clampValue));
  float brightness = max(max(limited.r, limited.g), limited.b);
  float soft = clamp(brightness - threshold + knee, 0.0, 2.0 * knee);
  soft = (soft * soft) * (0.25 / max(knee, 0.00001));
  float contribution = max(soft, brightness - threshold);
  contribution /= max(brightness, 0.00001);
  return limited * contribution;
}

void main() {
  vec4 source = samplePrefilterSource(vUv);
  vec3 color = prefilterColor(
    max(source.rgb, vec3(0.0)),
    max(uBloomThresholdData.x, 0.0),
    max(uBloomThresholdData.y, 0.00001),
    max(uBloomThresholdData.z, 0.0)
  );
  float alpha = clamp(source.a * max(color.r, max(color.g, color.b)), 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
