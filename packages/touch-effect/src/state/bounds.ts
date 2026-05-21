import type { BurstBounds } from '../types'

export const createBounds = (minX = 0, maxX = 0, minY = 0, maxY = 0): BurstBounds => ({
  minX,
  maxX,
  minY,
  maxY,
})

export const unionBurstBounds = (...boundsList: BurstBounds[]): BurstBounds =>
{
  const validBounds = boundsList.filter((bounds) =>
    Number.isFinite(bounds.minX)
    && Number.isFinite(bounds.maxX)
    && Number.isFinite(bounds.minY)
    && Number.isFinite(bounds.maxY)
  )

  if (!validBounds.length)
  {
    return createBounds()
  }

  return createBounds(
    Math.min(...validBounds.map((bounds) => bounds.minX)),
    Math.max(...validBounds.map((bounds) => bounds.maxX)),
    Math.min(...validBounds.map((bounds) => bounds.minY)),
    Math.max(...validBounds.map((bounds) => bounds.maxY))
  )
}

export const expandBurstBounds = (bounds: BurstBounds, padding: number): BurstBounds => createBounds(
  bounds.minX - padding,
  bounds.maxX + padding,
  bounds.minY - padding,
  bounds.maxY + padding
)
