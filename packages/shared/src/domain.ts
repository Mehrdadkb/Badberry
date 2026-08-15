import { z } from 'zod'
import {
  DEFAULT_GRID_SIZE,
  MAX_PLAYER_NAME_LENGTH,
  MAX_SCENE_DIMENSION,
  MAX_TOKEN_NAME_LENGTH,
  ROOM_CODE_LENGTH,
} from './constants.ts'

/**
 * The shapes the client and server both hold. Every schema here is also the
 * runtime validator for that shape, so the types below cannot drift away from
 * what actually gets checked at the network boundary.
 */

const id = z.string().min(1).max(64)

/** Bounded on both ends, so `Infinity` and `NaN` fail validation. */
const coordinate = z.number().min(-MAX_SCENE_DIMENSION).max(MAX_SCENE_DIMENSION)

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a #rrggbb color')

export const Vec2Schema = z.object({
  x: coordinate,
  y: coordinate,
})

export const PlayerSchema = z.object({
  id,
  name: z.string().min(1).max(MAX_PLAYER_NAME_LENGTH),
  color: hexColor,
  /** The GM may move any token; everyone else may only move their own. */
  isGm: z.boolean(),
  /**
   * A player who drops off keeps their seat (and their tokens) rather than
   * vanishing mid-session, so a flaky connection is not a data loss event.
   */
  connected: z.boolean(),
})

export const TokenSchema = z.object({
  id,
  name: z.string().min(1).max(MAX_TOKEN_NAME_LENGTH),
  pos: Vec2Schema,
  /** Footprint in grid squares. 1 = medium, 2 = large, and so on. */
  size: z.number().int().min(1).max(8),
  color: hexColor,
  imageUrl: z.string().max(2048).nullable(),
  /** Player id who controls this token, or null for a GM-only token. */
  controlledBy: id.nullable(),
})

export const SceneSchema = z.object({
  id,
  name: z.string().min(1).max(MAX_TOKEN_NAME_LENGTH),
  imageUrl: z.string().max(2048),
  width: z.number().int().min(1).max(MAX_SCENE_DIMENSION),
  height: z.number().int().min(1).max(MAX_SCENE_DIMENSION),
  gridSize: z.number().int().min(4).max(512).default(DEFAULT_GRID_SIZE),
})

export const RoomStateSchema = z.object({
  code: z.string().length(ROOM_CODE_LENGTH),
  /**
   * Incremented by the server on every mutation. Clients drop any state
   * message whose version is not newer than the one they already have, which
   * makes out-of-order delivery harmless.
   */
  version: z.number().int().nonnegative(),
  players: z.array(PlayerSchema),
  scene: SceneSchema.nullable(),
  /** Array order is z-order: earlier entries render behind later ones. */
  tokens: z.array(TokenSchema),
})

export type Vec2 = z.infer<typeof Vec2Schema>
export type Player = z.infer<typeof PlayerSchema>
export type Token = z.infer<typeof TokenSchema>
export type Scene = z.infer<typeof SceneSchema>
export type RoomState = z.infer<typeof RoomStateSchema>
