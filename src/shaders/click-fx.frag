precision highp float;

#define MAX_BURSTS 8
#define PARTICLES_PER_BURST 3
#define MAX_ACTIVE_PARTICLES 24

uniform float uTime;
uniform vec2 uResolution;
uniform vec4 uBurstData[MAX_BURSTS];
uniform vec4 uBurstCoreData[MAX_BURSTS];
uniform vec4 uBurstCoreAnimData[MAX_BURSTS];
uniform vec4 uBurstCoreToneData[MAX_BURSTS];
uniform vec4 uBurstFragmentData[MAX_BURSTS];
uniform vec4 uBurstBounds[MAX_BURSTS];
uniform vec4 uParticleA0[MAX_BURSTS];
uniform vec4 uParticleB0[MAX_BURSTS];
uniform vec4 uParticleC0[MAX_BURSTS];
uniform vec4 uParticleA1[MAX_BURSTS];
uniform vec4 uParticleB1[MAX_BURSTS];
uniform vec4 uParticleC1[MAX_BURSTS];
uniform vec4 uParticleA2[MAX_BURSTS];
uniform vec4 uParticleB2[MAX_BURSTS];
uniform vec4 uParticleC2[MAX_BURSTS];
uniform vec4 uFragmentParticleA0[MAX_BURSTS];
uniform vec4 uFragmentParticleB0[MAX_BURSTS];
uniform vec4 uFragmentParticleC0[MAX_BURSTS];
uniform vec4 uFragmentParticleA1[MAX_BURSTS];
uniform vec4 uFragmentParticleB1[MAX_BURSTS];
uniform vec4 uFragmentParticleC1[MAX_BURSTS];
uniform vec4 uFragmentParticleA2[MAX_BURSTS];
uniform vec4 uFragmentParticleB2[MAX_BURSTS];
uniform vec4 uFragmentParticleC2[MAX_BURSTS];
uniform vec4 uFragmentParticleA3[MAX_BURSTS];
uniform vec4 uFragmentParticleB3[MAX_BURSTS];
uniform vec4 uFragmentParticleC3[MAX_BURSTS];
uniform vec4 uFragmentParticleA4[MAX_BURSTS];
uniform vec4 uFragmentParticleB4[MAX_BURSTS];
uniform vec4 uFragmentParticleC4[MAX_BURSTS];
uniform vec4 uFragmentParticleA5[MAX_BURSTS];
uniform vec4 uFragmentParticleB5[MAX_BURSTS];
uniform vec4 uFragmentParticleC5[MAX_BURSTS];
uniform vec4 uFragmentParticleA6[MAX_BURSTS];
uniform vec4 uFragmentParticleB6[MAX_BURSTS];
uniform vec4 uFragmentParticleC6[MAX_BURSTS];
uniform vec4 uFragmentParticleA7[MAX_BURSTS];
uniform vec4 uFragmentParticleB7[MAX_BURSTS];
uniform vec4 uFragmentParticleC7[MAX_BURSTS];
uniform vec4 uFragmentParticleA8[MAX_BURSTS];
uniform vec4 uFragmentParticleB8[MAX_BURSTS];
uniform vec4 uFragmentParticleC8[MAX_BURSTS];
uniform vec4 uFragmentParticleA9[MAX_BURSTS];
uniform vec4 uFragmentParticleB9[MAX_BURSTS];
uniform vec4 uFragmentParticleC9[MAX_BURSTS];
uniform vec2 uPolarParams;
uniform float uRotationSpeedRad;
uniform vec3 uArcColor;
uniform vec3 uCompositeScaleParams;
uniform vec4 uFragmentScaleCurveParams;
uniform vec2 uFragmentAlphaParams;
uniform vec3 uFragmentInitScaleParams;
uniform float uCorePreviewStage;
uniform float uFragmentPreviewStage;
uniform vec4 uBranchVisibility;

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
  float falloffPower = mix(3.0, 0.65, clamp(softness, 0.0, 1.0));
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

float sampleFragmentParticle(vec4 particleA, vec4 particleB, vec4 particleC, vec2 point, float baseSize, float time, float useLifetimeScale) {
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
  float changePeriod = max(particleC.w, 0.0001);
  if (progress < growFrac) {
    return uFragmentAlphaParams.x;
  }

  float flashProgress = progress - growFrac;
  float flashStep = floor(flashProgress / changePeriod);
  float phase = mod(flashStep, 2.0);
  return phase < 0.5 ? uFragmentAlphaParams.x : uFragmentAlphaParams.y;
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 uv = (vUv - 0.5) * aspect;
  float arcIntensity = 0.0;
  vec3 coreColor = vec3(0.0);
  vec3 fragmentColor = vec3(0.0);
  float mainArcVisible = uBranchVisibility.x;
  float coreDiskVisible = uBranchVisibility.y;
  float mainFxVisible = uBranchVisibility.z;
  float fragmentsVisible = uBranchVisibility.w;
  float halfAngle = uPolarParams.x * 0.5;
  float arcRadius = uPolarParams.y;
  float arcCenterAngle = 1.57079633;
  vec3 coreDiskBlue = vec3(0.30980393, 0.71764708, 1.0);
  vec3 fragmentTargetColor = vec3(0.45882353, 0.88627451, 1.0);

  for (int burstIndex = 0; burstIndex < MAX_BURSTS; burstIndex++) {
    vec4 burst = uBurstData[burstIndex];
    vec4 bounds = uBurstBounds[burstIndex];

    if (burst.z <= 0.0) {
      continue;
    }

    vec2 origin = (burst.xy - 0.5) * aspect;
    vec2 baseLocal = uv - origin;
    vec4 coreA = uBurstCoreData[burstIndex];
    vec4 coreB = uBurstCoreAnimData[burstIndex];
    vec4 coreC = uBurstCoreToneData[burstIndex];
    vec4 fragmentData = uBurstFragmentData[burstIndex];
    float compositeEnd = coreB.w + coreA.w;
    float compositeDuration = max(compositeEnd - burst.w, 0.0001);
    float compositeWindow = max(compositeDuration * max(uCompositeScaleParams.z, 0.0001), 0.0001);
    float compositeProgress = clamp((uTime - burst.w) / compositeWindow, 0.0, 1.0);
    float compositeScale = mix(uCompositeScaleParams.x, uCompositeScaleParams.y, easeOutCubic(compositeProgress));
    vec2 compositeLocal = baseLocal / max(compositeScale, 0.0001);

    if (coreDiskVisible > 0.0) {
      float burstProgress = clamp((uTime - burst.w) / max(coreA.w, 0.0001), 0.0, 1.0);
      float b0Height = heightCircle(compositeLocal, coreA.x, coreA.y);
      float b1Mask = circleMask(compositeLocal, coreA.z, 0.0025);
      float scaleProgress = clamp(burstProgress / max(coreB.z, 0.0001), 0.0, 1.0);
      float b2Scale = mix(coreB.x, coreB.y, easeOutCubic(scaleProgress));
      float b2Mask = circleMask(compositeLocal / max(b2Scale, 0.0001), coreA.z, 0.0025);
      float curveDistance = mix(0.0, coreA.x, burstProgress);
      float seqValue = heightCircle(vec2(curveDistance, 0.0), coreA.x, coreA.y);
      float graySeq = seqValue * coreC.x;
      float alphaSeq = seqValue * coreC.y;
      float b3Mask = b2Mask * graySeq * alphaSeq;
      float b4Mask = b3Mask * coreC.z;

      if (uCorePreviewStage < 0.5) {
        coreColor += vec3(b0Height);
      } else if (uCorePreviewStage < 1.5) {
        coreColor += vec3(b1Mask);
      } else if (uCorePreviewStage < 2.5) {
        coreColor += vec3(b2Mask);
      } else if (uCorePreviewStage < 3.5) {
        coreColor += vec3(b3Mask);
      } else {
        coreColor += coreDiskBlue * b4Mask;
      }
    }

    if (fragmentsVisible > 0.0) {
      vec2 spriteLocal = baseLocal / max(0.05 * max(fragmentData.x, 0.0001), 0.0001);
      float fragmentBurstProgress = clamp((uTime - burst.w) / max(fragmentData.w, 0.0001), 0.0, 1.0);
      float d9Scale = fragmentInitScale(fragmentBurstProgress);
      vec2 d9Local = baseLocal / max(d9Scale, 0.0001);
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
        fragmentMask = donutMask(baseLocal, fragmentData.y, fragmentData.z, 0.0035);
      } else if (uFragmentPreviewStage < 4.5) {
        fragmentMask = particleDistributionMap(baseLocal, fragmentData.y, fragmentData.z);
      } else if (uFragmentPreviewStage < 5.5) {
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA0[burstIndex],
          uFragmentParticleB0[burstIndex],
          uFragmentParticleC0[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA1[burstIndex],
          uFragmentParticleB1[burstIndex],
          uFragmentParticleC1[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA2[burstIndex],
          uFragmentParticleB2[burstIndex],
          uFragmentParticleC2[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA3[burstIndex],
          uFragmentParticleB3[burstIndex],
          uFragmentParticleC3[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA4[burstIndex],
          uFragmentParticleB4[burstIndex],
          uFragmentParticleC4[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA5[burstIndex],
          uFragmentParticleB5[burstIndex],
          uFragmentParticleC5[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA6[burstIndex],
          uFragmentParticleB6[burstIndex],
          uFragmentParticleC6[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA7[burstIndex],
          uFragmentParticleB7[burstIndex],
          uFragmentParticleC7[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA8[burstIndex],
          uFragmentParticleB8[burstIndex],
          uFragmentParticleC8[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA9[burstIndex],
          uFragmentParticleB9[burstIndex],
          uFragmentParticleC9[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          0.0
        );
      } else if (uFragmentPreviewStage < 6.5) {
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA0[burstIndex],
          uFragmentParticleB0[burstIndex],
          uFragmentParticleC0[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA1[burstIndex],
          uFragmentParticleB1[burstIndex],
          uFragmentParticleC1[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA2[burstIndex],
          uFragmentParticleB2[burstIndex],
          uFragmentParticleC2[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA3[burstIndex],
          uFragmentParticleB3[burstIndex],
          uFragmentParticleC3[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA4[burstIndex],
          uFragmentParticleB4[burstIndex],
          uFragmentParticleC4[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA5[burstIndex],
          uFragmentParticleB5[burstIndex],
          uFragmentParticleC5[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA6[burstIndex],
          uFragmentParticleB6[burstIndex],
          uFragmentParticleC6[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA7[burstIndex],
          uFragmentParticleB7[burstIndex],
          uFragmentParticleC7[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA8[burstIndex],
          uFragmentParticleB8[burstIndex],
          uFragmentParticleC8[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentMask += sampleFragmentParticle(
          uFragmentParticleA9[burstIndex],
          uFragmentParticleB9[burstIndex],
          uFragmentParticleC9[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
      } else if (uFragmentPreviewStage < 7.5) {
        float particleMask = sampleFragmentParticle(
          uFragmentParticleA0[burstIndex],
          uFragmentParticleB0[burstIndex],
          uFragmentParticleC0[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA0[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA1[burstIndex],
          uFragmentParticleB1[burstIndex],
          uFragmentParticleC1[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA1[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA2[burstIndex],
          uFragmentParticleB2[burstIndex],
          uFragmentParticleC2[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA2[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA3[burstIndex],
          uFragmentParticleB3[burstIndex],
          uFragmentParticleC3[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA3[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA4[burstIndex],
          uFragmentParticleB4[burstIndex],
          uFragmentParticleC4[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA4[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA5[burstIndex],
          uFragmentParticleB5[burstIndex],
          uFragmentParticleC5[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA5[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA6[burstIndex],
          uFragmentParticleB6[burstIndex],
          uFragmentParticleC6[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA6[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA7[burstIndex],
          uFragmentParticleB7[burstIndex],
          uFragmentParticleC7[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA7[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA8[burstIndex],
          uFragmentParticleB8[burstIndex],
          uFragmentParticleC8[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA8[burstIndex], uTime)) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA9[burstIndex],
          uFragmentParticleB9[burstIndex],
          uFragmentParticleC9[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA9[burstIndex], uTime)) * particleMask;
      } else if (uFragmentPreviewStage < 8.5) {
        float particleMask = sampleFragmentParticle(
          uFragmentParticleA0[burstIndex],
          uFragmentParticleB0[burstIndex],
          uFragmentParticleC0[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA0[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA0[burstIndex], uFragmentParticleC0[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA1[burstIndex],
          uFragmentParticleB1[burstIndex],
          uFragmentParticleC1[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA1[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA1[burstIndex], uFragmentParticleC1[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA2[burstIndex],
          uFragmentParticleB2[burstIndex],
          uFragmentParticleC2[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA2[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA2[burstIndex], uFragmentParticleC2[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA3[burstIndex],
          uFragmentParticleB3[burstIndex],
          uFragmentParticleC3[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA3[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA3[burstIndex], uFragmentParticleC3[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA4[burstIndex],
          uFragmentParticleB4[burstIndex],
          uFragmentParticleC4[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA4[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA4[burstIndex], uFragmentParticleC4[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA5[burstIndex],
          uFragmentParticleB5[burstIndex],
          uFragmentParticleC5[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA5[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA5[burstIndex], uFragmentParticleC5[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA6[burstIndex],
          uFragmentParticleB6[burstIndex],
          uFragmentParticleC6[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA6[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA6[burstIndex], uFragmentParticleC6[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA7[burstIndex],
          uFragmentParticleB7[burstIndex],
          uFragmentParticleC7[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA7[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA7[burstIndex], uFragmentParticleC7[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA8[burstIndex],
          uFragmentParticleB8[burstIndex],
          uFragmentParticleC8[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA8[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA8[burstIndex], uFragmentParticleC8[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA9[burstIndex],
          uFragmentParticleB9[burstIndex],
          uFragmentParticleC9[burstIndex],
          baseLocal,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA9[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA9[burstIndex], uFragmentParticleC9[burstIndex], uTime) * particleMask;
      } else {
        float particleMask = sampleFragmentParticle(
          uFragmentParticleA0[burstIndex],
          uFragmentParticleB0[burstIndex],
          uFragmentParticleC0[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA0[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA0[burstIndex], uFragmentParticleC0[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA1[burstIndex],
          uFragmentParticleB1[burstIndex],
          uFragmentParticleC1[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA1[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA1[burstIndex], uFragmentParticleC1[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA2[burstIndex],
          uFragmentParticleB2[burstIndex],
          uFragmentParticleC2[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA2[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA2[burstIndex], uFragmentParticleC2[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA3[burstIndex],
          uFragmentParticleB3[burstIndex],
          uFragmentParticleC3[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA3[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA3[burstIndex], uFragmentParticleC3[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA4[burstIndex],
          uFragmentParticleB4[burstIndex],
          uFragmentParticleC4[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA4[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA4[burstIndex], uFragmentParticleC4[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA5[burstIndex],
          uFragmentParticleB5[burstIndex],
          uFragmentParticleC5[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA5[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA5[burstIndex], uFragmentParticleC5[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA6[burstIndex],
          uFragmentParticleB6[burstIndex],
          uFragmentParticleC6[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA6[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA6[burstIndex], uFragmentParticleC6[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA7[burstIndex],
          uFragmentParticleB7[burstIndex],
          uFragmentParticleC7[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA7[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA7[burstIndex], uFragmentParticleC7[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA8[burstIndex],
          uFragmentParticleB8[burstIndex],
          uFragmentParticleC8[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA8[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA8[burstIndex], uFragmentParticleC8[burstIndex], uTime) * particleMask;
        particleMask = sampleFragmentParticle(
          uFragmentParticleA9[burstIndex],
          uFragmentParticleB9[burstIndex],
          uFragmentParticleC9[burstIndex],
          d9Local,
          fragmentData.x,
          uTime,
          1.0
        );
        fragmentColor += mix(vec3(1.0), fragmentTargetColor, fragmentColorProgress(uFragmentParticleA9[burstIndex], uTime))
          * fragmentAlphaValue(uFragmentParticleA9[burstIndex], uFragmentParticleC9[burstIndex], uTime) * particleMask;
      }

      if (uFragmentPreviewStage < 6.5) {
        fragmentColor += vec3(fragmentMask);
      }
    }

    if (mainArcVisible <= 0.0) {
      continue;
    }

    vec2 local = compositeLocal;
    float rotationAngle = max(uTime - coreB.w, 0.0) * uRotationSpeedRad;
    float sinAngle = sin(-rotationAngle);
    float cosAngle = cos(-rotationAngle);
    local = vec2(
      local.x * cosAngle - local.y * sinAngle,
      local.x * sinAngle + local.y * cosAngle
    );
    local.x *= -1.0;

    vec2 delta = local;
    float radialDistance = length(delta);
    float angle = atan(delta.y, delta.x);
    float angleDiff = atan(sin(angle - arcCenterAngle), cos(angle - arcCenterAngle));

    if (abs(angleDiff) > halfAngle) {
      continue;
    }

    float angleT = (angleDiff + halfAngle) / max(2.0 * halfAngle, 0.0001);
    float sourceX = radialDistance - arcRadius;
    float sourceY = mix(bounds.z, bounds.w, angleT);

    if (sourceX < bounds.x || sourceX > bounds.y) {
      continue;
    }

    vec2 sourcePoint = vec2(sourceX, sourceY);
    arcIntensity += sampleParticle(uParticleA0[burstIndex], uParticleB0[burstIndex], uParticleC0[burstIndex], sourcePoint, uTime);
    arcIntensity += sampleParticle(uParticleA1[burstIndex], uParticleB1[burstIndex], uParticleC1[burstIndex], sourcePoint, uTime);
    arcIntensity += sampleParticle(uParticleA2[burstIndex], uParticleB2[burstIndex], uParticleC2[burstIndex], sourcePoint, uTime);
  }

  vec3 mainFxColor = (min(coreColor, vec3(1.0)) + min(uArcColor * arcIntensity, vec3(1.0))) * mainFxVisible;
  vec3 color = mainFxColor + min(fragmentColor, vec3(1.0));
  gl_FragColor = vec4(min(color, vec3(1.0)), 1.0);
}
