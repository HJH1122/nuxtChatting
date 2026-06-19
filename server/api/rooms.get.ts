import prisma from '../utils/prisma'

export default defineEventHandler(async (event) => {
  const rooms = await prisma.room.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
  return rooms
})
