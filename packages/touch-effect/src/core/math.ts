export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

export const easeInOutSine = (value: number) => -(Math.cos(Math.PI * value) - 1) * 0.5

export const easeInQuad = (value: number) => value * value

export const randomBetween = (min: number, max: number) => min + (max - min) * Math.random()

export const randomSigned = (range: number) => randomBetween(-range, range)

export const randomIntInclusive = (min: number, max: number) =>
{
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  return Math.floor(randomBetween(lower, upper + 1))
}
