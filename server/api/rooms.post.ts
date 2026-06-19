import prisma from '../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, creatorId } = body

  if (!name || typeof name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Room name is required',
    })
  }

  if (!creatorId || typeof creatorId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Creator ID is required',
    })
  }

  // Create the room in the database
  const room = await prisma.room.create({
    data: {
      name: name.trim(),
      creatorId: creatorId,
    },
  })

  return room
})
