precision highp float;

uniform float uTime;
uniform vec4 uLocalBounds;
uniform vec4 uBurstTiming;
uniform vec4 uDiskShapeData;
uniform vec4 uDiskScaleData;
uniform vec4 uDiskAlphaData;
uniform vec3 uDiskColor;
uniform vec4 uArcData;
uniform vec4 uArcAlphaData;
uniform vec3 uArcColor;
uniform vec4 uCompositorScaleData;
uniform vec3 uMixerWeights;
uniform vec4 uMixerParams;
uniform float uPreviewMode;
uniform float uEffectScale;
uniform vec4 uShardsShapeData;
uniform vec4 uShardsScaleCurveData;
uniform vec2 uShardsAlphaData;
uniform vec4 uShardsInitScaleData;
uniform vec3 uShardsTint;
uniform vec4 uShardsColorData;
uniform vec4 uArcSourceBounds;
uniform vec4 uParticleA0;
uniform vec4 uParticleB0;
uniform vec4 uParticleC0;
uniform vec4 uParticleA1;
uniform vec4 uParticleB1;
uniform vec4 uParticleC1;
uniform vec4 uParticleA2;
uniform vec4 uParticleB2;
uniform vec4 uParticleC2;
uniform vec4 uFragmentParticleA0;
uniform vec4 uFragmentParticleB0;
uniform vec4 uFragmentParticleC0;
uniform vec4 uFragmentParticleA1;
uniform vec4 uFragmentParticleB1;
uniform vec4 uFragmentParticleC1;
uniform vec4 uFragmentParticleA2;
uniform vec4 uFragmentParticleB2;
uniform vec4 uFragmentParticleC2;
uniform vec4 uFragmentParticleA3;
uniform vec4 uFragmentParticleB3;
uniform vec4 uFragmentParticleC3;
uniform vec4 uFragmentParticleA4;
uniform vec4 uFragmentParticleB4;
uniform vec4 uFragmentParticleC4;
uniform vec4 uFragmentParticleA5;
uniform vec4 uFragmentParticleB5;
uniform vec4 uFragmentParticleC5;
uniform vec4 uFragmentParticleA6;
uniform vec4 uFragmentParticleB6;
uniform vec4 uFragmentParticleC6;
uniform vec4 uFragmentParticleA7;
uniform vec4 uFragmentParticleB7;
uniform vec4 uFragmentParticleC7;
uniform vec4 uFragmentParticleA8;
uniform vec4 uFragmentParticleB8;
uniform vec4 uFragmentParticleC8;
uniform vec4 uFragmentParticleA9;
uniform vec4 uFragmentParticleB9;
uniform vec4 uFragmentParticleC9;

varying vec2 vUv;

float circleMask(vec2 point, float radius, float blur) {
  float dist = length(point);
  return 1.0 - smoothstep(radius, radius + blur, dist);
}

float easeInOutSine(float value) {
  return -(cos(3.14159265 * value) - 1.0) * 0.5;
}

float easeOutCubic(float value) {
  float t = clamp(value, 0.0, 1.0);
  float inv = 1.0 - t;
  return 1.0 - inv * inv * inv;
}

float easeInQuad(float value) {
  return value * value;
}

float sdEquilateralTriangle(vec2 point, float radius) {
  const float k = 1.7320508;
  point.x = abs(point.x) - radius;
  point.y = point.y + radius / k;
  if (point.x + k * point.y > 0.0) {
    point = vec2(point.x - k * point.y, -k * point.x - point.y) * 0.5;
  }
  point.x -= clamp(point.x, -2.0 * radius, 0.0);
  return -length(point) * sign(point.y);
}

float triangleMask(vec2 point, float blur) {
  float sd = sdEquilateralTriangle(point, 1.0);
  return 1.0 - smoothstep(0.0, blur, sd);
}

float fragmentDistributionMask(vec2 point, float outerRadius, float innerRadius, float blur) {
  float dist = length(point);
  float outer = 1.0 - smoothstep(outerRadius, outerRadius + blur, dist);
  float inner = 1.0 - smoothstep(innerRadius, innerRadius + blur, dist);
  return max(outer - inner, 0.0);
}

float sampleParticle(vec4 particleA, vec4 particleB, vec4 particleC, vec2 sourcePoint, float time) {
  if (particleA.w <= 0.0 || particleA.y <= 0.0) {
    return 0.0;
  }

  float progress = (time - particleA.x) / particleA.y;
  if (progress < 0.0 || progress > 1.0) {
    return 0.0;
  }

  float clamped = clamp(progress, 0.0, 1.0);
  float movementEase = easeInOutSine(clamped);
  float scaleEase = 1.0 - easeInQuad(clamped);
  float dynamicScale = particleA.z * scaleEase;
  vec2 particleCenter = vec2(
    particleB.x,
    particleB.y + particleB.z * particleA.z * movementEase
  );

  vec2 local = sourcePoint - particleCenter;
  vec2 ellipsePoint = vec2(
    local.x / max(particleC.x * dynamicScale, 0.0001),
    local.y / max(particleC.y * dynamicScale, 0.0001)
  );

  return circleMask(ellipsePoint, particleB.w, 0.0025);
}

float sampleArcSource(vec2 sourcePoint, float sourceStep, float time) {
  float center = 0.0;
  float upper = 0.0;
  float lower = 0.0;

  center += sampleParticle(uParticleA0, uParticleB0, uParticleC0, sourcePoint, time);
  center += sampleParticle(uParticleA1, uParticleB1, uParticleC1, sourcePoint, time);
  center += sampleParticle(uParticleA2, uParticleB2, uParticleC2, sourcePoint, time);

  vec2 offset = vec2(0.0, sourceStep);
  upper += sampleParticle(uParticleA0, uParticleB0, uParticleC0, sourcePoint + offset, time);
  upper += sampleParticle(uParticleA1, uParticleB1, uParticleC1, sourcePoint + offset, time);
  upper += sampleParticle(uParticleA2, uParticleB2, uParticleC2, sourcePoint + offset, time);

  lower += sampleParticle(uParticleA0, uParticleB0, uParticleC0, sourcePoint - offset, time);
  lower += sampleParticle(uParticleA1, uParticleB1, uParticleC1, sourcePoint - offset, time);
  lower += sampleParticle(uParticleA2, uParticleB2, uParticleC2, sourcePoint - offset, time);

  return center * 0.6 + (upper + lower) * 0.2;
}

float shardsGrowthFactor(float progress) {
  float growFrac = clamp(uShardsScaleCurveData.w, 0.0001, 1.0);
  return clamp(progress / growFrac, 0.0, 1.0);
}

float shardsLifetimeScale(float progress) {
  float t = clamp(progress, 0.0, 1.0);
  float growFrac = clamp(uShardsScaleCurveData.w, 0.0001, 1.0);
  if (t < growFrac) {
    return mix(uShardsScaleCurveData.x, uShardsScaleCurveData.y, shardsGrowthFactor(t));
  }

  float decayWindow = max(1.0 - growFrac, 0.0001);
  float decayT = clamp((t - growFrac) / decayWindow, 0.0, 1.0);
  return mix(uShardsScaleCurveData.y, uShardsScaleCurveData.z, decayT);
}

float shardsInitScale(float progress) {
  float t = clamp(progress, 0.0, 1.0);
  float initFrac = clamp(uShardsInitScaleData.z, 0.0001, 1.0);
  float initProgress = clamp(t / initFrac, 0.0, 1.0);
  return mix(uShardsInitScaleData.x, uShardsInitScaleData.y, easeOutCubic(initProgress));
}

float sampleShardParticle(
  vec4 particleA,
  vec4 particleB,
  vec4 particleC,
  vec2 point,
  float baseSize,
  float time
) {
  if (particleA.w <= 0.0 || particleA.y <= 0.0) {
    return 0.0;
  }

  float progress = (time - particleA.x) / particleA.y;
  if (progress < 0.0 || progress > 1.0) {
    return 0.0;
  }

  vec2 center = vec2(
    particleB.x + particleB.z * particleA.z * progress,
    particleB.y + particleB.w * particleA.z * progress
  );
  vec2 local = point - center;
  float sinAngle = sin(-particleC.x);
  float cosAngle = cos(-particleC.x);
  local = vec2(
    local.x * cosAngle - local.y * sinAngle,
    local.x * sinAngle + local.y * cosAngle
  );

  if (particleC.y > 0.5) {
    local.y *= -1.0;
  }

  float sizeScale = particleC.z * shardsLifetimeScale(progress);
  vec2 spriteLocal = local / max(0.05 * max(baseSize * sizeScale, 0.0001), 0.0001);
  return triangleMask(spriteLocal, 0.04);
}

float shardParticleProgress(vec4 particleA, float time) {
  if (particleA.w <= 0.0 || particleA.y <= 0.0) {
    return -1.0;
  }

  float progress = (time - particleA.x) / particleA.y;
  if (progress < 0.0 || progress > 1.0) {
    return -1.0;
  }

  return progress;
}

float shardAlphaValue(vec4 particleA, vec4 particleC, float time) {
  float progress = shardParticleProgress(particleA, time);
  if (progress < 0.0) {
    return 0.0;
  }

  const float flashStart = 0.28824294;
  const float flashEnd = 0.85294878;
  const float defaultFlashPeriod = 0.115;
  float flashTimeWarp = clamp(max(particleC.w, 0.0001) / defaultFlashPeriod, 0.65, 1.35);
  float remapped = progress;

  if (progress > flashStart && progress < flashEnd) {
    float local = (progress - flashStart) / max(flashEnd - flashStart, 0.0001);
    local = clamp(local / flashTimeWarp, 0.0, 1.0);
    remapped = flashStart + local * (flashEnd - flashStart);
  }

  float alphaCurve = 1.0;
  if (remapped < flashStart) {
    alphaCurve = 1.0;
  } else if (remapped < 0.36470589) {
    alphaCurve = mix(1.0, 0.0, (remapped - flashStart) / max(0.36470589 - flashStart, 0.0001));
  } else if (remapped < 0.47058824) {
    alphaCurve = mix(0.0, 1.0, (remapped - 0.36470589) / max(0.47058824 - 0.36470589, 0.0001));
  } else if (remapped < 0.57352561) {
    alphaCurve = mix(1.0, 0.0, (remapped - 0.47058824) / max(0.57352561 - 0.47058824, 0.0001));
  } else if (remapped < 0.66764325) {
    alphaCurve = mix(0.0, 1.0, (remapped - 0.57352561) / max(0.66764325 - 0.57352561, 0.0001));
  } else if (remapped < 0.75588620) {
    alphaCurve = mix(1.0, 0.0, (remapped - 0.66764325) / max(0.75588620 - 0.66764325, 0.0001));
  } else if (remapped < flashEnd) {
    alphaCurve = mix(0.0, 1.0, (remapped - 0.75588620) / max(flashEnd - 0.75588620, 0.0001));
  }

  return mix(uShardsAlphaData.y, uShardsAlphaData.x, clamp(alphaCurve, 0.0, 1.0));
}

vec3 shardPaletteColor(float progress) {
  vec3 startColor = vec3(0.53773582, 0.53773582, 0.53773582);
  vec3 whiteColor = vec3(1.0, 1.0, 1.0);
  vec3 blueColorA = vec3(0.37264150, 0.77318728, 1.0);
  vec3 blueColorB = vec3(0.37254903, 0.77254909, 1.0);
  vec3 cyanDipColor = vec3(0.35294119, 0.72941178, 0.94509810);
  vec3 endBlueColor = vec3(0.37254903, 0.77254909, 1.0);
  float t = clamp(progress, 0.0, 1.0);

  if (t < 0.18236057) {
    return mix(startColor, whiteColor, smoothstep(0.0, 0.18236057, t));
  }

  if (t < 0.28235295) {
    return mix(whiteColor, blueColorA, smoothstep(0.18236057, 0.28235295, t));
  }

  if (t < 0.46176851) {
    return mix(blueColorA, blueColorB, smoothstep(0.28235295, 0.46176851, t));
  }

  if (t < 0.66176850) {
    return mix(blueColorB, cyanDipColor, smoothstep(0.46176851, 0.66176850, t));
  }

  if (t < 0.82647443) {
    return mix(cyanDipColor, endBlueColor, smoothstep(0.66176850, 0.82647443, t));
  }

  return endBlueColor;
}

float shardPeakWeight(float progress) {
  float t = clamp(progress, 0.0, 1.0);
  float rise = smoothstep(0.18236057, 0.28235295, t);
  float fall = 1.0 - smoothstep(0.46176851, 0.66176850, t);
  return clamp(rise * fall, 0.0, 1.0);
}

float shardColorProgress(vec4 particleA, float time) {
  float progress = shardParticleProgress(particleA, time);
  if (progress < 0.0) {
    return 0.0;
  }
  return clamp(progress, 0.0, 1.0);
}

vec3 shardThemeColor(vec4 particleA, float time) {
  float progress = shardColorProgress(particleA, time);
  vec3 palette = shardPaletteColor(progress);
  vec3 tinted = palette * max(uShardsTint, vec3(0.0));
  float peakBoost = mix(1.0, max(uShardsColorData.x, 0.0), shardPeakWeight(progress));
  return tinted * peakBoost;
}

void accumulateShardColor(
  inout vec3 color,
  inout float alpha,
  vec2 point,
  float baseSize,
  vec4 particleA,
  vec4 particleB,
  vec4 particleC
) {
  float particleMask = sampleShardParticle(particleA, particleB, particleC, point, baseSize, uTime);
  if (particleMask <= 0.0) {
    return;
  }

  color += shardThemeColor(particleA, uTime)
    * shardAlphaValue(particleA, particleC, uTime)
    * particleMask;
  float shardAlpha = clamp(shardAlphaValue(particleA, particleC, uTime) * particleMask, 0.0, 1.0);
  alpha = 1.0 - (1.0 - alpha) * (1.0 - shardAlpha);
}

vec2 rotate2d(vec2 point, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(point.x * c - point.y * s, point.x * s + point.y * c);
}

vec3 screenBlend(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

float saturate01(float value) {
  return clamp(value, 0.0, 1.0);
}

float unionAlpha(float a, float b) {
  return 1.0 - (1.0 - saturate01(a)) * (1.0 - saturate01(b));
}

float mixFinalAlpha(vec3 weights, float arcAlpha, float diskAlpha, float shardsAlpha) {
  vec3 alphaWeights = clamp(weights, vec3(0.0), vec3(1.0));
  float mixed = 0.0;
  mixed = unionAlpha(mixed, arcAlpha * alphaWeights.x);
  mixed = unionAlpha(mixed, diskAlpha * alphaWeights.y);
  mixed = unionAlpha(mixed, shardsAlpha * alphaWeights.z);
  return mixed;
}

vec3 mixFinalLayers(vec3 arcLayer, vec3 diskLayer, vec3 shardsLayer, vec3 weights, float mode, float gain) {
  vec3 clampedWeights = max(weights, vec3(0.0));
  vec3 weightedArc = max(arcLayer, vec3(0.0)) * clampedWeights.x;
  vec3 weightedDisk = max(diskLayer, vec3(0.0)) * clampedWeights.y;
  vec3 weightedShards = max(shardsLayer, vec3(0.0)) * clampedWeights.z;
  vec3 mixed = vec3(0.0);

  if (mode < 0.5) {
    mixed = weightedArc + weightedDisk + weightedShards;
  } else if (mode < 1.5) {
    mixed = screenBlend(screenBlend(weightedDisk, weightedArc), weightedShards);
  } else {
    mixed = max(weightedArc, max(weightedDisk, weightedShards));
  }

  return mixed * max(gain, 0.0);
}

void main() {
  vec2 baseLocal = vec2(
    mix(uLocalBounds.x, uLocalBounds.y, vUv.x),
    mix(uLocalBounds.z, uLocalBounds.w, vUv.y)
  );
  vec2 effectLocal = baseLocal / max(uEffectScale, 0.0001);

  float compositeEnd = uBurstTiming.y + uBurstTiming.z;
  float compositeDuration = max(compositeEnd - uBurstTiming.x, 0.0001);
  float compositeWindow = max(compositeDuration * max(uCompositorScaleData.z, 0.0001), 0.0001);
  float compositeProgress = clamp((uTime - uBurstTiming.x) / compositeWindow, 0.0, 1.0);
  float compositeScale = mix(uCompositorScaleData.x, uCompositorScaleData.y, easeOutCubic(compositeProgress));
  vec2 compositeLocal = effectLocal / max(compositeScale, 0.0001);

  float diskBurstProgress = clamp((uTime - uBurstTiming.x) / max(uBurstTiming.z, 0.0001), 0.0, 1.0);
  float diskBlur = mix(0.0015, 0.02, clamp(uDiskShapeData.y, 0.0, 1.0));
  float diskScaleProgress = clamp(diskBurstProgress / max(uDiskScaleData.z, 0.0001), 0.0, 1.0);
  float diskScaleValue = mix(uDiskScaleData.x, uDiskScaleData.y, easeOutCubic(diskScaleProgress));
  float diskScaledMask = circleMask(compositeLocal / max(diskScaleValue, 0.0001), uDiskShapeData.x, diskBlur);
  float diskAlphaProgress = clamp(
    (diskBurstProgress - uDiskAlphaData.z) / max(1.0 - uDiskAlphaData.z, 0.0001),
    0.0,
    1.0
  );
  float diskAlphaValue = mix(uDiskAlphaData.x, uDiskAlphaData.y, easeOutCubic(diskAlphaProgress));
  float diskAlpha = saturate01(diskScaledMask * diskAlphaValue);
  vec3 diskLayer = max(uDiskColor, vec3(0.0)) * diskAlpha;

  float arcIntensity = 0.0;
  vec2 arcLocal = compositeLocal;
  float rotationAngle = max(uTime - uBurstTiming.y, 0.0) * uArcData.z;
  float initialAngle = uDiskScaleData.w;
  arcLocal = rotate2d(arcLocal, -(initialAngle + rotationAngle));
  arcLocal.x *= -1.0;

  float radialDistance = length(arcLocal);
  float angle = atan(arcLocal.y, arcLocal.x);
  float arcCenterAngle = 1.57079633;
  float halfAngle = uArcData.x * 0.5;
  float angleDiff = atan(sin(angle - arcCenterAngle), cos(angle - arcCenterAngle));

  if (abs(angleDiff) <= halfAngle) {
    float angleT = (angleDiff + halfAngle) / max(2.0 * halfAngle, 0.0001);
    float sourceX = radialDistance - uArcData.y;
    float sourceY = mix(uArcSourceBounds.z, uArcSourceBounds.w, angleT);
    float sourceSpan = max(uArcSourceBounds.w - uArcSourceBounds.z, 0.0);
    float sourceStep = max(sourceSpan / 40.0, 0.004);

    if (sourceX >= uArcSourceBounds.x && sourceX <= uArcSourceBounds.y) {
      arcIntensity = sampleArcSource(vec2(sourceX, sourceY), sourceStep, uTime);
    }
  }

  float arcAlpha = saturate01(arcIntensity * uArcAlphaData.x);
  vec3 arcLayer = max(uArcColor, vec3(0.0)) * max(arcIntensity * uArcAlphaData.x, 0.0);

  float shardBurstProgress = clamp((uTime - uBurstTiming.x) / max(uBurstTiming.w, 0.0001), 0.0, 1.0);
  float shardsInit = shardsInitScale(shardBurstProgress);
  vec2 shardsLocal = effectLocal / max(shardsInit, 0.0001);
  vec3 shardsLayer = vec3(0.0);
  float shardsAlpha = 0.0;

  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA0, uFragmentParticleB0, uFragmentParticleC0);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA1, uFragmentParticleB1, uFragmentParticleC1);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA2, uFragmentParticleB2, uFragmentParticleC2);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA3, uFragmentParticleB3, uFragmentParticleC3);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA4, uFragmentParticleB4, uFragmentParticleC4);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA5, uFragmentParticleB5, uFragmentParticleC5);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA6, uFragmentParticleB6, uFragmentParticleC6);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA7, uFragmentParticleB7, uFragmentParticleC7);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA8, uFragmentParticleB8, uFragmentParticleC8);
  accumulateShardColor(shardsLayer, shardsAlpha, shardsLocal, uShardsShapeData.x, uFragmentParticleA9, uFragmentParticleB9, uFragmentParticleC9);

  vec3 finalColor = mixFinalLayers(
    arcLayer,
    diskLayer,
    shardsLayer,
    uMixerWeights.xyz,
    uMixerParams.x,
    uMixerParams.y
  );
  float finalAlpha = mixFinalAlpha(uMixerWeights.xyz, arcAlpha, diskAlpha, shardsAlpha);

  if (uPreviewMode < 0.5) {
    finalColor = finalColor;
  } else if (uPreviewMode < 1.5) {
    finalColor = arcLayer;
    finalAlpha = arcAlpha;
  } else if (uPreviewMode < 2.5) {
    finalColor = diskLayer;
    finalAlpha = diskAlpha;
  } else {
    finalColor = shardsLayer;
    finalAlpha = shardsAlpha;
  }

  gl_FragColor = vec4(max(finalColor, vec3(0.0)), saturate01(finalAlpha));
}
