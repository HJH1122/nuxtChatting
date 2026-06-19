import prisma from '../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name } = body

  if (!name || typeof name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name is required',
    })
  }

  // Create a new user in the database
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
    },
  })

  return user
})
