import prisma from '../utils/prisma'
import { roomUsers } from '../utils/roomState'

export default defineEventHandler(async (event) => {
  const rooms = await prisma.room.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
  
  return rooms.map((room) => {
    const usersMap = roomUsers.get(room.id)
    const activeUsers = usersMap ? Array.from(usersMap.values()) : []
    return {
      ...room,
      activeUsers
    }
  })
})
