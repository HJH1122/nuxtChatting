import { Server } from 'socket.io'
import prisma from '../utils/prisma'

// In-memory storage for active users in rooms
// roomId -> Map of socket.id -> user info
const roomUsers = new Map<string, Map<string, { id: string; name: string; isHost?: boolean }>>()
// socket.id -> { roomId, user }
const socketUserMap = new Map<string, { roomId: string; user: { id: string; name: string; isHost?: boolean } }>()

export default defineNitroPlugin((nitroApp) => {
    console.log('⚡️ Socket.io server plugin is initializing...')
    let io: Server

    const setupSocketHandlers = (ioInstance: Server) => {
        ioInstance.on('connection', (socket) => {
            console.log('User connected:', socket.id);

            // --- 1. Room Join Logic ---
            socket.on('join-room', async (data) => {
                try {
                    let roomId: string
                    let user: { id: string; name: string; isHost?: boolean } | null = null

                    if (typeof data === 'string') {
                        roomId = data
                    } else if (data && typeof data === 'object') {
                        roomId = data.roomId
                        user = data.user
                    } else {
                        return
                    }

                    await socket.join(roomId);
                    console.log(`[${socket.id}] User joined room ${roomId}`);

                    if (user) {
                        // Clean up existing room session if any
                        const existing = socketUserMap.get(socket.id)
                        if (existing && existing.roomId !== roomId) {
                            const oldRoomId = existing.roomId
                            const oldRoomUsers = roomUsers.get(oldRoomId)
                            if (oldRoomUsers) {
                                oldRoomUsers.delete(socket.id)
                                if (oldRoomUsers.size === 0) {
                                    roomUsers.delete(oldRoomId)
                                } else {
                                    ioInstance.to(oldRoomId).emit('online-users', Array.from(oldRoomUsers.values()))
                                }
                            }
                        }

                        // Map socket to room and user
                        socketUserMap.set(socket.id, { roomId, user })

                        if (!roomUsers.has(roomId)) {
                            roomUsers.set(roomId, new Map())
                        }
                        const usersInRoom = roomUsers.get(roomId)!
                        usersInRoom.set(socket.id, user)

                        // Broadcast the updated list of users to the room
                        ioInstance.to(roomId).emit('online-users', Array.from(usersInRoom.values()))
                    }
                } catch (e) {
                    console.error("Failed to join room:", e);
                }
            });

            // --- 2. Room Leave Logic ---
            socket.on('leave-room', (roomId) => {
                try {
                    socket.leave(roomId);
                    console.log(`[${socket.id}] User left room ${roomId}`);

                    const existing = socketUserMap.get(socket.id)
                    if (existing && existing.roomId === roomId) {
                        socketUserMap.delete(socket.id)
                    }

                    const usersInRoom = roomUsers.get(roomId)
                    if (usersInRoom) {
                        usersInRoom.delete(socket.id)
                        if (usersInRoom.size === 0) {
                            roomUsers.delete(roomId)
                        } else {
                            ioInstance.to(roomId).emit('online-users', Array.from(usersInRoom.values()))
                        }
                    }
                } catch (e) {
                    console.error("Failed to leave room:", e);
                }
            });

            // --- 3. Message Handling (CORE CHANGE: Persistence first) ---
            socket.on('message', async (data) => {
                if (!data || (!data.content && !data.attachment) || !data.roomId) return;

                const session = socketUserMap.get(socket.id);
                if (!session || !session.user) {
                    console.error("Session not found for socket.id:", socket.id);
                    return;
                }

                // ⭐️ PERSISTENCE LAYER START ⭐️
                try {
                    const messagePayload = await prisma.message.create({
                        data: {
                            content: data.content || '',
                            senderId: session.user.id,
                            roomId: data.roomId,
                            type: data.type || "text",
                            attachmentName: data.attachment?.name || null,
                            attachmentUrl: data.attachment?.url || null,
                            attachmentType: data.attachment?.type || null,
                            attachmentSize: data.attachment?.size || null,
                        },
                        include: {
                            sender: true
                        }
                    });

                    const broadcastData = {
                        id: messagePayload.id,
                        content: messagePayload.content,
                        senderId: messagePayload.senderId,
                        senderName: messagePayload.sender.name,
                        createdAt: messagePayload.createdAt.toISOString(),
                        type: messagePayload.type,
                        attachment: messagePayload.attachmentUrl ? {
                            name: messagePayload.attachmentName,
                            url: messagePayload.attachmentUrl,
                            type: messagePayload.attachmentType,
                            size: messagePayload.attachmentSize
                        } : undefined
                    };

                    // ⭐️ BROADCAST ⭐️
                    ioInstance.to(data.roomId).emit('message', broadcastData);
                } catch (e) {
                    console.error("Error saving or broadcasting message:", e);
                    // Broadcast failure to the room in case of DB issue
                    ioInstance.to(data.roomId).emit('message_error', 'Failed to send message: Database error.');
                }
            });

            // --- 4. Disconnect Logic (Cleanup) ---
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
                const existing = socketUserMap.get(socket.id)
                if (existing) {
                    const { roomId } = existing
                    const usersInRoom = roomUsers.get(roomId)
                    if (usersInRoom) {
                        usersInRoom.delete(socket.id)
                        if (usersInRoom.size === 0) {
                            roomUsers.delete(roomId)
                        } else {
                            ioInstance.to(roomId).emit('online-users', Array.from(usersInRoom.values()))
                        }
                    }
                    socketUserMap.delete(socket.id)
                }
            });
        })
    }

    // In development, bind Socket.io to a custom port (e.g. 3001) to bypass Vite dev proxy issues.
    // In production, bind to the active Nitro server instance directly.
    if (process.env.NODE_ENV === 'production') {
        nitroApp.hooks.hook('listen', (server) => {
            console.log('⚡️ Socket.io server is initializing on Nitro listen hook (Production)...')
            io = new Server(server)
            setupSocketHandlers(io)
        })
    } else {
        console.log('⚡️ Socket.io server is initializing on Port 3001 (Development)...')
        io = new Server(3001, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        })
        setupSocketHandlers(io)
    }

    nitroApp.hooks.hook('close', async () => {
        if (io) {
            console.log('⚡️ Closing Socket.io server...')
            await io.close()
        }
    })
})