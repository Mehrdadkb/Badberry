import { z } from 'zod'
import {
  MAX_PLAYER_NAME_LENGTH,
  MAX_SCENE_DIMENSION,
  MAX_TOKEN_NAME_LENGTH,
  PROTOCOL_VERSION,
  ROOM_CODE_LENGTH,
} from './constants.ts'
import { RoomStateSchema, TokenSchema, Vec2Schema } from './domain.ts'

/**
 * The wire protocol.
 *
 * Clients send *intents* ("I want to move this token here"), never state. The
 * server decides what actually happened and broadcasts the result. Keeping that
 * asymmetry visible in the type names is the point: there is no client message
 * that carries a `RoomState`.
 */

/* ------------------------------------------------------------------ client */

export const ClientMsgSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join'),
    /** Checked against the server's PROTOCOL_VERSION before anything else. */
    protocolVersion: z.number().int(),
    roomCode: z.string().length(ROOM_CODE_LENGTH),
    name: z.string().min(1).max(MAX_PLAYER_NAME_LENGTH),
  }),
  z.object({
    type: z.literal('moveToken'),
    tokenId: TokenSchema.shape.id,
    pos: Vec2Schema,
  }),
  z.object({
    type: z.literal('addToken'),
    name: z.string().min(1).max(MAX_TOKEN_NAME_LENGTH),
    pos: Vec2Schema,
    color: TokenSchema.shape.color,
    /** Omitted for a plain colored disc; the server assigns the token id. */
    imageUrl: TokenSchema.shape.imageUrl.optional(),
  }),
  z.object({
    type: z.literal('removeToken'),
    tokenId: TokenSchema.shape.id,
  }),
  z.object({
    type: z.literal('setScene'),
    name: z.string().min(1).max(MAX_TOKEN_NAME_LENGTH),
    imageUrl: z.string().max(2048),
    width: z.number().int().min(1).max(MAX_SCENE_DIMENSION),
    height: z.number().int().min(1).max(MAX_SCENE_DIMENSION),
  }),
])

export type ClientMsg = z.infer<typeof ClientMsgSchema>

/* ------------------------------------------------------------------ server */

export const ERROR_CODES = [
  'bad_message',
  'protocol_mismatch',
  'not_joined',
  'not_allowed',
  'unknown_token',
  'room_full',
] as const

export const ServerMsgSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    /** Which player in `state.players` is you — needed to know what you control. */
    playerId: z.string(),
    state: RoomStateSchema,
  }),
  z.object({
    type: z.literal('state'),
    /** The whole room, every time. Small enough to be worth the simplicity. */
    state: RoomStateSchema,
  }),
  z.object({
    type: z.literal('error'),
    code: z.enum(ERROR_CODES),
    message: z.string(),
  }),
])

export type ServerMsg = z.infer<typeof ServerMsgSchema>
export type ErrorCode = (typeof ERROR_CODES)[number]

/* ----------------------------------------------------------------- codecs */

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function decodeWith<T>(schema: z.ZodType<T>, raw: string): ParseResult<T> {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'malformed JSON' }
  }
  const result = schema.safeParse(json)
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: z.prettifyError(result.error) }
}

/**
 * The server's only entry point for anything a socket sends. Everything past
 * this call is a validated `ClientMsg`; nothing past it should ever re-check
 * shapes by hand.
 */
export function decodeClientMsg(raw: string): ParseResult<ClientMsg> {
  return decodeWith(ClientMsgSchema, raw)
}

/**
 * The mirror image for the client. The server is trusted, so this is really a
 * development guard: it catches protocol drift loudly instead of letting a
 * renamed field surface as a silent `undefined` three layers deeper.
 */
export function decodeServerMsg(raw: string): ParseResult<ServerMsg> {
  return decodeWith(ServerMsgSchema, raw)
}

export function encode(msg: ClientMsg | ServerMsg): string {
  return JSON.stringify(msg)
}

/** Convenience for the client's first message after the socket opens. */
export function joinMsg(roomCode: string, name: string): ClientMsg {
  return { type: 'join', protocolVersion: PROTOCOL_VERSION, roomCode, name }
}
