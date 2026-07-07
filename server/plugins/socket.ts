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
                if (!data || (!data.content && !data.attachment && !data.poll) || !data.roomId) return;

                const session = socketUserMap.get(socket.id);
                if (!session || !session.user) {
                    console.error("Session not found for socket.id:", socket.id);
                    return;
                }

                // ⭐️ PERSISTENCE LAYER START ⭐️
                try {
                    let pollPayload = null;
                    if (data.type === 'poll' && data.poll) {
                        pollPayload = await prisma.poll.create({
                            data: {
                                question: data.poll.question,
                                roomId: data.roomId,
                                options: {
                                    create: data.poll.options.map((opt: string) => ({
                                        text: opt
                                    }))
                                }
                            },
                            include: {
                                options: {
                                    include: {
                                        votes: true
                                    }
                                }
                            }
                        });
                    }

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
                            pollId: pollPayload ? pollPayload.id : null,
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
                        } : undefined,
                        poll: pollPayload ? {
                            id: pollPayload.id,
                            question: pollPayload.question,
                            options: pollPayload.options.map(opt => ({
                                id: opt.id,
                                text: opt.text,
                                votes: opt.votes.length,
                                voters: opt.votes.map(v => v.userId)
                            })),
                            totalVotes: pollPayload.options.reduce((sum, opt) => sum + opt.votes.length, 0)
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

            // --- 3.5 Vote Handling ---
            socket.on('vote', async (data) => {
                if (!data || !data.pollId || !data.optionId || !data.userId || !data.roomId) return;

                try {
                    // Check if the user has already voted on this poll
                    const existingVote = await prisma.vote.findFirst({
                        where: {
                            userId: data.userId,
                            option: {
                                pollId: data.pollId
                            }
                        }
                    });

                    if (existingVote) {
                        // Delete the old vote
                        await prisma.vote.delete({
                            where: {
                                id: existingVote.id
                            }
                        });

                        // If user clicked a different option, create a new vote
                        if (existingVote.optionId !== data.optionId) {
                            await prisma.vote.create({
                                data: {
                                    userId: data.userId,
                                    optionId: data.optionId
                                }
                            });
                        }
                    } else {
                        // Create a new vote
                        await prisma.vote.create({
                            data: {
                                userId: data.userId,
                                optionId: data.optionId
                            }
                        });
                    }

                    // Get updated poll results
                    const updatedPoll = await prisma.poll.findUnique({
                        where: { id: data.pollId },
                        include: {
                            options: {
                                include: {
                                    votes: true
                                }
                            }
                        }
                    });

                    if (updatedPoll) {
                        const pollData = {
                            id: updatedPoll.id,
                            question: updatedPoll.question,
                            options: updatedPoll.options.map(opt => ({
                                id: opt.id,
                                text: opt.text,
                                votes: opt.votes.length,
                                voters: opt.votes.map(v => v.userId)
                            })),
                            totalVotes: updatedPoll.options.reduce((sum, opt) => sum + opt.votes.length, 0)
                        };

                        ioInstance.to(data.roomId).emit('poll-updated', pollData);
                    }
                } catch (e) {
                    console.error("Error handling vote:", e);
                }
            });

            // --- 3.6 Edit Message Handling ---
            socket.on('edit-message', async (data) => {
                if (!data || !data.messageId || !data.content || !data.roomId) return;

                const session = socketUserMap.get(socket.id);
                if (!session || !session.user) {
                    console.error("Session not found for socket.id:", socket.id);
                    return;
                }

                try {
                    // Check ownership
                    const message = await prisma.message.findUnique({
                        where: { id: data.messageId }
                    });

                    if (!message) {
                        console.error("Message not found:", data.messageId);
                        return;
                    }

                    if (message.senderId !== session.user.id) {
                        console.error("Unauthorized edit attempt by user:", session.user.id);
                        return;
                    }

                    // Update message content
                    const updatedMessage = await prisma.message.update({
                        where: { id: data.messageId },
                        data: {
                            content: data.content,
                            isEdited: true
                        },
                        include: {
                            sender: true
                        }
                    });

                    const broadcastData = {
                        id: updatedMessage.id,
                        content: updatedMessage.content,
                        senderId: updatedMessage.senderId,
                        senderName: updatedMessage.sender.name,
                        createdAt: updatedMessage.createdAt.toISOString(),
                        type: updatedMessage.type,
                        isEdited: updatedMessage.isEdited,
                        attachment: updatedMessage.attachmentUrl ? {
                            name: updatedMessage.attachmentName,
                            url: updatedMessage.attachmentUrl,
                            type: updatedMessage.attachmentType,
                            size: updatedMessage.attachmentSize
                        } : undefined
                    };

                    ioInstance.to(data.roomId).emit('message-updated', broadcastData);
                } catch (e) {
                    console.error("Error editing message:", e);
                }
            });

            // --- 3.7 Delete Message Handling ---
            socket.on('delete-message', async (data) => {
                if (!data || !data.messageId || !data.roomId) return;

                const session = socketUserMap.get(socket.id);
                if (!session || !session.user) {
                    console.error("Session not found for socket.id:", socket.id);
                    return;
                }

                try {
                    // Check ownership or host status
                    const message = await prisma.message.findUnique({
                        where: { id: data.messageId }
                    });

                    if (!message) {
                        console.error("Message not found:", data.messageId);
                        return;
                    }

                    const isOwnMessage = message.senderId === session.user.id;

                    const room = await prisma.room.findUnique({
                        where: { id: data.roomId }
                    });
                    const isRoomHost = room?.creatorId === session.user.id;

                    if (!isOwnMessage && !isRoomHost) {
                        console.error("Unauthorized delete attempt by user:", session.user.id);
                        return;
                    }

                    // Delete the message
                    await prisma.message.delete({
                        where: { id: data.messageId }
                    });

                    // If it was a poll, try deleting the poll structure too
                    if (message.pollId) {
                        try {
                            await prisma.poll.delete({
                                where: { id: message.pollId }
                            });
                        } catch (pollError) {
                            console.error("Error deleting related poll:", pollError);
                        }
                    }

                    ioInstance.to(data.roomId).emit('message-deleted', data.messageId);
                } catch (e) {
                    console.error("Error deleting message:", e);
                }
            });

            // --- 3.8 Kick User Handling ---
            socket.on('kick-user', async (data) => {
                if (!data || !data.roomId || !data.userId) return;

                const session = socketUserMap.get(socket.id);
                if (!session || !session.user || !session.user.isHost) {
                    console.error("Unauthorized kick attempt by socket:", socket.id);
                    return;
                }

                // Find target socket ID and target user info before deleting
                let targetSocketId: string | null = null;
                let targetUser: { id: string; name: string } | null = null;
                for (const [sId, sSession] of socketUserMap.entries()) {
                    if (sSession.roomId === data.roomId && sSession.user.id === data.userId) {
                        targetSocketId = sId;
                        targetUser = sSession.user;
                        break;
                    }
                }

                if (targetSocketId && targetUser) {
                    const targetSocket = ioInstance.sockets.sockets.get(targetSocketId);
                    
                    // 1. Clean up socket memory map first
                    socketUserMap.delete(targetSocketId);
                    const usersInRoom = roomUsers.get(data.roomId);
                    if (usersInRoom) {
                        usersInRoom.delete(targetSocketId);
                        ioInstance.to(data.roomId).emit('online-users', Array.from(usersInRoom.values()));
                    }

                    // 2. Broadcast system message: "[유저명] 님이 강퇴되었습니다."
                    try {
                        const messagePayload = await prisma.message.create({
                            data: {
                                content: `🚨 '${targetUser.name}' 님이 방장에 의해 강제 퇴장되었습니다.`,
                                senderId: session.user.id, // Use current host's id to satisfy foreign key constraint
                                roomId: data.roomId,
                                type: 'system',
                            },
                            include: {
                                sender: true
                            }
                        });

                        const broadcastData = {
                            id: messagePayload.id,
                            content: messagePayload.content,
                            senderId: messagePayload.senderId,
                            senderName: 'System',
                            createdAt: messagePayload.createdAt.toISOString(),
                            type: messagePayload.type
                        };

                        ioInstance.to(data.roomId).emit('message', broadcastData);
                    } catch (e) {
                        console.error("Error creating kick system message:", e);
                    }

                    // 3. Notify the target user and make them leave the socket room
                    if (targetSocket) {
                        targetSocket.emit('kicked', { roomId: data.roomId });
                        targetSocket.leave(data.roomId);
                    }

                    console.log(`[Socket] User ${targetUser.name} (${data.userId}) was kicked from room ${data.roomId}`);
                }
            });

            // --- 3.9 Transfer Host Handling ---
            socket.on('transfer-host', async (data) => {
                if (!data || !data.roomId || !data.userId) return;

                const session = socketUserMap.get(socket.id);
                if (!session || !session.user || !session.user.isHost) {
                    console.error("Unauthorized transfer-host attempt by socket:", socket.id);
                    return;
                }

                try {
                    // Update room creator in Database
                    await prisma.room.update({
                        where: { id: data.roomId },
                        data: { creatorId: data.userId }
                    });

                    // Update memory state
                    const usersInRoom = roomUsers.get(data.roomId);
                    let targetUser: { id: string; name: string } | null = null;
                    if (usersInRoom) {
                        for (const [sId, u] of usersInRoom.entries()) {
                            if (u.id === session.user.id) {
                                u.isHost = false;
                                const oldHostSession = socketUserMap.get(sId);
                                if (oldHostSession) oldHostSession.user.isHost = false;
                            }
                            if (u.id === data.userId) {
                                u.isHost = true;
                                targetUser = u;
                                const newHostSession = socketUserMap.get(sId);
                                if (newHostSession) newHostSession.user.isHost = true;
                            }
                        }
                        ioInstance.to(data.roomId).emit('online-users', Array.from(usersInRoom.values()));
                    }

                    if (targetUser) {
                        // Broadcast system message about host transfer
                        const messagePayload = await prisma.message.create({
                            data: {
                                content: `👑 방장 권한이 '${targetUser.name}' 님에게 위임되었습니다.`,
                                senderId: data.userId, // Use the new host's ID
                                roomId: data.roomId,
                                type: 'system',
                            },
                            include: {
                                sender: true
                            }
                        });

                        const broadcastData = {
                            id: messagePayload.id,
                            content: messagePayload.content,
                            senderId: messagePayload.senderId,
                            senderName: 'System',
                            createdAt: messagePayload.createdAt.toISOString(),
                            type: messagePayload.type
                        };

                        ioInstance.to(data.roomId).emit('message', broadcastData);
                    }

                    // Notify clients to update their activeRoom.creatorId and isHost state
                    ioInstance.to(data.roomId).emit('host-transferred', {
                        roomId: data.roomId,
                        newHostId: data.userId
                    });

                    console.log(`[Socket] Host of room ${data.roomId} transferred to user ${data.userId}`);
                } catch (e) {
                    console.error("Error transferring host:", e);
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