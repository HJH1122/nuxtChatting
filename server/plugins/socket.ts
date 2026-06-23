import { Server } from 'socket.io'
// ⚠️ IMPORTANT: This line assumes the PrismaClient is initialized elsewhere in the Nitro context (e.g., via app.hooks.hook('connect', ...) or globally imported). For this simulation, we use a global/inferred scope for prisma.
// const prisma = new PrismaClient() // <-- MUST BE INITIALIZED PROPERLY IN THE CONTEXT

export default defineNitroPlugin((nitroApp) => {
    const engine = (nitroApp.h3App as any).server
    if (!engine) return

    const io = new Server(engine)

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // --- 1. Room Join Logic ---
        socket.on('join-room', async (roomId) => {
            try {
                await socket.join(roomId);
                console.log(`[${socket.id}] User joined room ${roomId}`);
            } catch (e) {
                console.error("Failed to join room:", e);
            }
        });

        // --- 2. Message Handling (CORE CHANGE: Persistence first) ---
        socket.on('message', async (data) => {
            if (!data || !data.content || !data.roomId) return;

            // ⭐️ PERSISTENCE LAYER START ⭐️
            try {
                // ATTENTION: Must replace 'prisma' with the actual initialized client instance.
                const messagePayload = await prisma.message.create({
                    data: {
                        content: data.content,
                        senderId: socket.id, // TODO: Replace with authenticated user ID!
                        roomId: data.roomId,
                        type: "text",
                    },
                });

                const broadcastData = {
                    id: messagePayload.id,
                    content: messagePayload.content,
                    senderId: messagePayload.senderId,
                    createdAt: messagePayload.createdAt.toISOString(),
                    type: messagePayload.type,
                };

                // ⭐️ BROADCAST ⭐️
                io.to(data.roomId).emit('message', broadcastData);
            } catch (e) {
                console.error("Error saving or broadcasting message:", e);
                // Broadcast failure to the room in case of DB issue
                io.to(data.roomId).emit('message_error', 'Failed to send message: Database error.');
            }
        });

        // --- 3. Disconnect Logic (Cleanup) ---
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // TODO: Implement logic here to update online_users list and notify others.
        });
    })

    // Expose io to nitro context if needed
    nitroApp.hooks.hook('close', async () => {
        await io.close()
    })
})