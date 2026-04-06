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
uniform vec2 uPolarParams;
uniform float uRotationSpeedRad;
uniform vec3 uArcColor;
uniform vec3 uCompositeScaleParams;
uniform float uCorePreviewStage;
uniform vec3 uBranchVisibility;

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

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 uv = (vUv - 0.5) * aspect;
  float arcIntensity = 0.0;
  vec3 coreColor = vec3(0.0);
  float mainArcVisible = uBranchVisibility.x;
  float coreDiskVisible = uBranchVisibility.y;
  float mainFxVisible = uBranchVisibility.z;
  float halfAngle = uPolarParams.x * 0.5;
  float arcRadius = uPolarParams.y;
  float arcCenterAngle = 1.57079633;
  vec3 coreDiskBlue = vec3(0.30980393, 0.71764708, 1.0);

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
    float compositeEnd = coreB.w + coreA.w;
    float compositeDuration = max(compositeEnd - burst.w, 0.0001);
    float compositeWindow = max(compositeDuration * max(uCompositeScaleParams.z, 0.0001), 0.0001);
    float compositeProgress = clamp((uTime - burst.w) / compositeWindow, 0.0, 1.0);
    float compositeScale = mix(uCompositeScaleParams.x, uCompositeScaleParams.y, easeOutCubic(compositeProgress));
    vec2 compositeLocal = baseLocal / max(compositeScale, 0.0001);

    if (coreDiskVisible > 0.0) {
      vec4 coreC = uBurstCoreToneData[burstIndex];
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

  vec3 color = (min(coreColor, vec3(1.0)) + min(uArcColor * arcIntensity, vec3(1.0))) * mainFxVisible;
  gl_FragColor = vec4(min(color, vec3(1.0)), 1.0);
}
