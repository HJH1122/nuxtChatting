// server/utils/roomState.ts

export const roomUsers = new Map<string, Map<string, { id: string; name: string; isHost?: boolean }>>()
export const socketUserMap = new Map<string, { roomId: string; user: { id: string; name: string; isHost?: boolean } }>()
