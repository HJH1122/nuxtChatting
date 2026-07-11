import prisma from '../utils/prisma'

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
  return rooms
})
