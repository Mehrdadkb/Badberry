/**
 * Values that both the client and the server have to agree on. Anything only
 * one side cares about (render scale, socket timeouts, port numbers) does not
 * belong here.
 */

/**
 * Bumped whenever a change to the protocol breaks older clients. The server
 * rejects joins that do not match, which turns "my friend has a stale tab open"
 * from a confusing desync into a clear error message.
 */
export const PROTOCOL_VERSION = 1

/** Room codes are short enough to read aloud over voice chat. */
export const ROOM_CODE_LENGTH = 6

/** Pixels per grid square at 100% zoom. 70 is the common VTT default. */
export const DEFAULT_GRID_SIZE = 70

/**
 * How often a client may send position updates while a token is being dragged.
 * The client renders the drag locally at full framerate regardless; this only
 * throttles what goes over the wire.
 */
export const MOVE_UPDATE_HZ = 20

export const MAX_PLAYER_NAME_LENGTH = 32
export const MAX_TOKEN_NAME_LENGTH = 64

/** Guards against a client sending a token to coordinates that break rendering. */
export const MAX_SCENE_DIMENSION = 20_000
