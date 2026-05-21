import type { Texture } from 'ogl'
import type {
  BurstBounds,
  TouchEffectDebugState,
  TouchEffectInstance,
} from '../types'

export type TextureValue = Texture | null

export type HdrTargetSupport = {
  useHdr: boolean
  type: number
  internalFormat?: number
}

export type RuntimeState = {
  width: number
  height: number
  dpr: number
}

export type RenderRect = {
  localBounds: BurstBounds
  deviceX: number
  deviceY: number
  deviceWidth: number
  deviceHeight: number
}

export type InternalTouchEffectInstance = TouchEffectInstance & {
  setDebugState: (partial: Partial<TouchEffectDebugState>) => void
}
