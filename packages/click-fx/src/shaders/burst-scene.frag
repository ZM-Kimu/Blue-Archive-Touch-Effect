precision highp float;

uniform float uTime;
uniform vec4 uLocalBounds;
uniform vec4 uBurstTiming;
uniform vec4 uBurstCoreData;
uniform vec4 uBurstCoreAnimData;
uniform vec4 uBurstCoreToneData;
uniform vec4 uBurstFragmentData;
uniform vec4 uArcData;
uniform vec3 uArcColor;
uniform vec3 uBranchAlphaMix;
uniform vec3 uBranchBlendModes;
uniform vec3 uCompositeScaleParams;
uniform float uEffectScale;
uniform vec4 uFragmentScaleCurveParams;
uniform vec2 uFragmentAlphaParams;
uniform vec3 uFragmentInitScaleParams;
uniform float uCorePreviewStage;
uniform float uFragmentPreviewStage;
uniform vec4 uBranchVisibility;
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

float heightCircle(vec2 point, float radius, float softness) {
  float dist = length(point);
  float normalized = clamp(1.0 - dist / max(radius, 0.0001), 0.0, 1.0);
  float falloffPower = mix(3.0, 0.45, clamp(softness, 0.0, 1.0));
  return pow(normalized, falloffPower);
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

float donutMask(vec2 point, float outerRadius, float innerRadius, float blur) {
  float dist = length(point);
  float outer = 1.0 - smoothstep(outerRadius, outerRadius + blur, dist);
  float inner = 1.0 - smoothstep(innerRadius, innerRadius + blur, dist);
  return max(outer - inner, 0.0);
}

float hash21(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float particleDistributionMap(vec2 point, float outerRadius, float innerRadius) {
  float ring = donutMask(point, outerRadius, innerRadius, 0.0035);
  if (ring <= 0.0) {
    return 0.0;
  }

  vec2 normalized = point / max(outerRadius, 0.0001);
  vec2 scaled = normalized * 18.0;
  vec2 cell = floor(scaled);
  vec2 local = fract(scaled) - 0.5;
  float keep = step(0.42, hash21(cell));
  float dotRadius = mix(0.10, 0.22, hash21(cell + 17.0));
  float dotMask = 1.0 - smoothstep(dotRadius, dotRadius + 0.06, length(local));
  return ring * keep * dotMask;
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

float fragmentGrowthFactor(float progress) {
  float t = clamp(progress, 0.0, 1.0);
  float growFrac = clamp(uFragmentScaleCurveParams.w, 0.0001, 1.0);
  return clamp(t / growFrac, 0.0, 1.0);
}

float fragmentLifetimeScale(float progress) {
  float t = clamp(progress, 0.0, 1.0);
  float growFrac = clamp(uFragmentScaleCurveParams.w, 0.0001, 1.0);
  float startScale = uFragmentScaleCurveParams.x;
  float peakScale = uFragmentScaleCurveParams.y;
  float endScale = uFragmentScaleCurveParams.z;

  if (t < growFrac) {
    return mix(startScale, peakScale, fragmentGrowthFactor(t));
  }

  float decayWindow = max(1.0 - growFrac, 0.0001);
  float decayT = clamp((t - growFrac) / decayWindow, 0.0, 1.0);
  return mix(peakScale, endScale, decayT);
}

float fragmentInitScale(float progress) {
  float t = clamp(progress, 0.0, 1.0);
  float initFrac = clamp(uFragmentInitScaleParams.z, 0.0001, 1.0);
  float initProgress = clamp(t / initFrac, 0.0, 1.0);
  return mix(uFragmentInitScaleParams.x, uFragmentInitScaleParams.y, easeOutCubic(initProgress));
}

float sampleFragmentParticleScaled(
  vec4 particleA,
  vec4 particleB,
  vec4 particleC,
  vec2 point,
  float baseSize,
  float time,
  float useLifetimeScale
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

  float sizeScale = particleC.z;
  if (useLifetimeScale > 0.5) {
    sizeScale *= fragmentLifetimeScale(progress);
  }

  vec2 spriteLocal = local / max(0.05 * max(baseSize * sizeScale, 0.0001), 0.0001);
  return triangleMask(spriteLocal, 0.04);
}

float sampleFragmentParticle(
  vec4 particleA,
  vec4 particleB,
  vec4 particleC,
  vec2 point,
  float baseSize,
  float time,
  float useLifetimeScale
) {
  return sampleFragmentParticleScaled(particleA, particleB, particleC, point, baseSize, time, useLifetimeScale);
}

float fragmentColorProgress(vec4 particleA, float time) {
  if (particleA.w <= 0.0 || particleA.y <= 0.0) {
    return 0.0;
  }

  float progress = (time - particleA.x) / particleA.y;
  if (progress < 0.0 || progress > 1.0) {
    return 0.0;
  }

  return fragmentGrowthFactor(progress);
}

float fragmentParticleProgress(vec4 particleA, float time) {
  if (particleA.w <= 0.0 || particleA.y <= 0.0) {
    return -1.0;
  }

  float progress = (time - particleA.x) / particleA.y;
  if (progress < 0.0 || progress > 1.0) {
    return -1.0;
  }

  return progress;
}

float fragmentAlphaValue(vec4 particleA, vec4 particleC, float time) {
  float progress = fragmentParticleProgress(particleA, time);
  if (progress < 0.0) {
    return 0.0;
  }

  float growFrac = clamp(uFragmentScaleCurveParams.w, 0.0001, 1.0);
  float flashPeriod = max(particleC.w, 0.0001);
  if (progress < growFrac) {
    return uFragmentAlphaParams.x;
  }

  float flashProgress = progress - growFrac;
  float flashStep = floor(flashProgress / flashPeriod);
  float phase = mod(flashStep, 2.0);
  return phase < 0.5 ? uFragmentAlphaParams.x : uFragmentAlphaParams.y;
}

vec2 rotate2d(vec2 point, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(point.x * c - point.y * s, point.x * s + point.y * c);
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

void accumulateFragmentColor(
  inout vec3 color,
  vec2 point,
  float baseSize,
  vec4 particleA,
  vec4 particleB,
  vec4 particleC,
  float useLifetimeScale
) {
  float particleMask = sampleFragmentParticle(
    particleA,
    particleB,
    particleC,
    point,
    baseSize,
    uTime,
    useLifetimeScale
  );
  if (particleMask <= 0.0) {
    return;
  }

  vec3 targetColor = vec3(0.45882353, 0.88627451, 1.0);
  color += mix(vec3(1.0), targetColor, fragmentColorProgress(particleA, uTime))
    * fragmentAlphaValue(particleA, particleC, uTime)
    * particleMask;
}

float accumulateFragmentMask(
  vec2 point,
  float baseSize,
  float useLifetimeScale
) {
  float fragmentMask = 0.0;
  fragmentMask += sampleFragmentParticle(uFragmentParticleA0, uFragmentParticleB0, uFragmentParticleC0, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA1, uFragmentParticleB1, uFragmentParticleC1, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA2, uFragmentParticleB2, uFragmentParticleC2, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA3, uFragmentParticleB3, uFragmentParticleC3, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA4, uFragmentParticleB4, uFragmentParticleC4, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA5, uFragmentParticleB5, uFragmentParticleC5, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA6, uFragmentParticleB6, uFragmentParticleC6, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA7, uFragmentParticleB7, uFragmentParticleC7, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA8, uFragmentParticleB8, uFragmentParticleC8, point, baseSize, uTime, useLifetimeScale);
  fragmentMask += sampleFragmentParticle(uFragmentParticleA9, uFragmentParticleB9, uFragmentParticleC9, point, baseSize, uTime, useLifetimeScale);
  return fragmentMask;
}

void main() {
  vec2 baseLocal = vec2(
    mix(uLocalBounds.x, uLocalBounds.y, vUv.x),
    mix(uLocalBounds.z, uLocalBounds.w, vUv.y)
  );
  vec2 effectLocal = baseLocal / max(uEffectScale, 0.0001);

  float mainArcVisible = uBranchVisibility.x;
  float coreDiskVisible = uBranchVisibility.y;
  float mainFxVisible = uBranchVisibility.z;
  float fragmentsVisible = uBranchVisibility.w;
  vec3 coreColor = vec3(0.0);
  vec3 fragmentColor = vec3(0.0);
  float arcIntensity = 0.0;
  vec3 coreDiskBlue = vec3(0.30980393, 0.71764708, 1.0);

  float compositeEnd = uBurstTiming.y + uBurstTiming.z;
  float compositeDuration = max(compositeEnd - uBurstTiming.x, 0.0001);
  float compositeWindow = max(compositeDuration * max(uCompositeScaleParams.z, 0.0001), 0.0001);
  float compositeProgress = clamp((uTime - uBurstTiming.x) / compositeWindow, 0.0, 1.0);
  float compositeScale = mix(uCompositeScaleParams.x, uCompositeScaleParams.y, easeOutCubic(compositeProgress));
  vec2 compositeLocal = effectLocal / max(compositeScale, 0.0001);

  if (coreDiskVisible > 0.0) {
    float burstProgress = clamp((uTime - uBurstTiming.x) / max(uBurstTiming.z, 0.0001), 0.0, 1.0);
    float b0Height = heightCircle(compositeLocal, uBurstCoreData.x, uBurstCoreData.y);
    float b1Mask = circleMask(compositeLocal, uBurstCoreData.z, 0.0025);
    float scaleProgress = clamp(burstProgress / max(uBurstCoreAnimData.z, 0.0001), 0.0, 1.0);
    float b2Scale = mix(uBurstCoreAnimData.x, uBurstCoreAnimData.y, easeOutCubic(scaleProgress));
    float b2Mask = circleMask(compositeLocal / max(b2Scale, 0.0001), uBurstCoreData.z, 0.0025);
    float curveDistance = mix(0.0, uBurstCoreData.x, burstProgress);
    float seqValue = heightCircle(vec2(curveDistance, 0.0), uBurstCoreData.x, uBurstCoreData.y);
    float graySeq = seqValue * uBurstCoreToneData.x;
    float alphaSeq = seqValue * uBurstCoreToneData.y;
    float b3Gray = b2Mask * graySeq;
    float b3Alpha = b2Mask * alphaSeq;
    float b4Mask = b3Alpha * uBurstCoreToneData.z;

    if (uCorePreviewStage < 0.5) {
      coreColor += vec3(b0Height);
    } else if (uCorePreviewStage < 1.5) {
      coreColor += vec3(b1Mask);
    } else if (uCorePreviewStage < 2.5) {
      coreColor += vec3(b2Mask);
    } else if (uCorePreviewStage < 3.5) {
      coreColor += vec3(b3Gray);
    } else {
      coreColor += coreDiskBlue * b4Mask;
    }
  }

  if (fragmentsVisible > 0.0) {
    vec2 spriteLocal = effectLocal / max(0.05 * max(uBurstFragmentData.x, 0.0001), 0.0001);
    float fragmentBurstProgress = clamp((uTime - uBurstTiming.x) / max(uBurstTiming.w, 0.0001), 0.0, 1.0);
    float d9Scale = fragmentInitScale(fragmentBurstProgress);
    vec2 d9Local = effectLocal / max(d9Scale, 0.0001);
    float fragmentMask = 0.0;

    if (uFragmentPreviewStage < 0.5) {
      fragmentMask = triangleMask(spriteLocal, 0.04);
    } else if (uFragmentPreviewStage < 1.5) {
      spriteLocal.y *= -1.0;
      fragmentMask = triangleMask(spriteLocal, 0.04);
    } else if (uFragmentPreviewStage < 2.5) {
      vec2 upLocal = spriteLocal + vec2(1.15, 0.0);
      vec2 downLocal = spriteLocal - vec2(1.15, 0.0);
      downLocal.y *= -1.0;
      fragmentMask = triangleMask(upLocal, 0.04) + triangleMask(downLocal, 0.04);
    } else if (uFragmentPreviewStage < 3.5) {
      fragmentMask = donutMask(effectLocal, uBurstFragmentData.y, uBurstFragmentData.z, 0.0035);
    } else if (uFragmentPreviewStage < 4.5) {
      fragmentMask = particleDistributionMap(effectLocal, uBurstFragmentData.y, uBurstFragmentData.z);
    } else if (uFragmentPreviewStage < 5.5) {
      fragmentMask = accumulateFragmentMask(effectLocal, uBurstFragmentData.x, 0.0);
    } else if (uFragmentPreviewStage < 6.5) {
      fragmentMask = accumulateFragmentMask(effectLocal, uBurstFragmentData.x, 1.0);
    } else if (uFragmentPreviewStage < 7.5) {
      float particleMask = sampleFragmentParticle(uFragmentParticleA0, uFragmentParticleB0, uFragmentParticleC0, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA0, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA1, uFragmentParticleB1, uFragmentParticleC1, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA1, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA2, uFragmentParticleB2, uFragmentParticleC2, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA2, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA3, uFragmentParticleB3, uFragmentParticleC3, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA3, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA4, uFragmentParticleB4, uFragmentParticleC4, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA4, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA5, uFragmentParticleB5, uFragmentParticleC5, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA5, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA6, uFragmentParticleB6, uFragmentParticleC6, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA6, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA7, uFragmentParticleB7, uFragmentParticleC7, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA7, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA8, uFragmentParticleB8, uFragmentParticleC8, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA8, uTime)) * particleMask;
      particleMask = sampleFragmentParticle(uFragmentParticleA9, uFragmentParticleB9, uFragmentParticleC9, effectLocal, uBurstFragmentData.x, uTime, 1.0);
      fragmentColor += mix(vec3(1.0), vec3(0.45882353, 0.88627451, 1.0), fragmentColorProgress(uFragmentParticleA9, uTime)) * particleMask;
    } else if (uFragmentPreviewStage < 8.5) {
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA0, uFragmentParticleB0, uFragmentParticleC0, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA1, uFragmentParticleB1, uFragmentParticleC1, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA2, uFragmentParticleB2, uFragmentParticleC2, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA3, uFragmentParticleB3, uFragmentParticleC3, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA4, uFragmentParticleB4, uFragmentParticleC4, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA5, uFragmentParticleB5, uFragmentParticleC5, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA6, uFragmentParticleB6, uFragmentParticleC6, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA7, uFragmentParticleB7, uFragmentParticleC7, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA8, uFragmentParticleB8, uFragmentParticleC8, 1.0);
      accumulateFragmentColor(fragmentColor, effectLocal, uBurstFragmentData.x, uFragmentParticleA9, uFragmentParticleB9, uFragmentParticleC9, 1.0);
    } else {
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA0, uFragmentParticleB0, uFragmentParticleC0, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA1, uFragmentParticleB1, uFragmentParticleC1, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA2, uFragmentParticleB2, uFragmentParticleC2, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA3, uFragmentParticleB3, uFragmentParticleC3, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA4, uFragmentParticleB4, uFragmentParticleC4, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA5, uFragmentParticleB5, uFragmentParticleC5, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA6, uFragmentParticleB6, uFragmentParticleC6, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA7, uFragmentParticleB7, uFragmentParticleC7, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA8, uFragmentParticleB8, uFragmentParticleC8, 1.0);
      accumulateFragmentColor(fragmentColor, d9Local, uBurstFragmentData.x, uFragmentParticleA9, uFragmentParticleB9, uFragmentParticleC9, 1.0);
    }

    if (uFragmentPreviewStage < 6.5) {
      fragmentColor += vec3(fragmentMask);
    }
  }

  if (mainArcVisible > 0.0) {
    vec2 local = compositeLocal;
    float rotationAngle = max(uTime - uBurstTiming.y, 0.0) * uArcData.z;
    local = rotate2d(local, -rotationAngle);
    local.x *= -1.0;

    float radialDistance = length(local);
    float angle = atan(local.y, local.x);
    float halfAngle = uArcData.x * 0.5;
    float arcCenterAngle = 1.57079633;
    float angleDiff = atan(sin(angle - arcCenterAngle), cos(angle - arcCenterAngle));

    if (abs(angleDiff) <= halfAngle) {
      float angleT = (angleDiff + halfAngle) / max(2.0 * halfAngle, 0.0001);
      float sourceX = radialDistance - uArcData.y;
      float sourceY = mix(uArcSourceBounds.z, uArcSourceBounds.w, angleT);

      if (sourceX >= uArcSourceBounds.x && sourceX <= uArcSourceBounds.y) {
        vec2 sourcePoint = vec2(sourceX, sourceY);
        arcIntensity += sampleParticle(uParticleA0, uParticleB0, uParticleC0, sourcePoint, uTime);
        arcIntensity += sampleParticle(uParticleA1, uParticleB1, uParticleC1, sourcePoint, uTime);
        arcIntensity += sampleParticle(uParticleA2, uParticleB2, uParticleC2, sourcePoint, uTime);
      }
    }
  }

  vec3 coreLayer = blendLayer(
    vec3(0.0),
    clamp(coreColor, 0.0, 1.0),
    coreDiskVisible * uBranchAlphaMix.y,
    uBranchBlendModes.y
  );
  vec3 arcLayer = clamp(uArcColor * arcIntensity, 0.0, 1.0);
  vec3 fragmentLayer = clamp(fragmentColor, 0.0, 1.0);
  vec3 mainFxColor = coreLayer;

  mainFxColor = blendLayer(
    mainFxColor,
    arcLayer,
    mainArcVisible * uBranchAlphaMix.x,
    uBranchBlendModes.x
  );
  mainFxColor *= mainFxVisible;

  vec3 finalColor = blendLayer(
    mainFxColor,
    fragmentLayer,
    fragmentsVisible * uBranchAlphaMix.z,
    uBranchBlendModes.z
  );
  finalColor = clamp(finalColor, 0.0, 1.0);
  float alpha = clamp(max(finalColor.r, max(finalColor.g, finalColor.b)), 0.0, 1.0);
  gl_FragColor = vec4(finalColor, alpha);
}
