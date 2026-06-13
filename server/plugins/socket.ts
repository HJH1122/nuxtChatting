import { Server } from 'socket.io'

export default defineNitroPlugin((nitroApp) => {
  const engine = (nitroApp.h3App as any).server
  if (!engine) return

  const io = new Server(engine)

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join-room', (roomId) => {
      socket.join(roomId)
      console.log(`User ${socket.id} joined room ${roomId}`)
    })

    socket.on('message', (data) => {
      // Basic broadcast for now (no Prisma)
      io.to(data.roomId).emit('message', {
        id: Date.now().toString(),
        content: data.content,
        senderId: socket.id,
        createdAt: new Date().toISOString(),
      })
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
    })
  })

  // Expose io to nitro context if needed
  nitroApp.hooks.hook('close', async () => {
    await io.close()
  })
})
