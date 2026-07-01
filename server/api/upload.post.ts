import { promises as fs } from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file uploaded.'
    })
  }

  // Find the file field in the multipart form data
  const file = parts.find(part => part.name === 'file')
  if (!file || !file.filename || !file.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file provided in form data.'
    })
  }

  // 1. File size check (max 10MB)
  const maxBytes = 10 * 1024 * 1024 // 10MB
  if (file.data.length > maxBytes) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File size exceeds the 10MB limit.'
    })
  }

  // 2. Extension check (PDF, PNG, JPG/JPEG)
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
  const ext = path.extname(file.filename).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF, PNG, and JPG/JPEG files are allowed.'
    })
  }

  // Create public/uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadDir, { recursive: true })

  // Generate unique filename to prevent overwriting
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`
  const filePath = path.join(uploadDir, uniqueFilename)

  // Write file to disk
  await fs.writeFile(filePath, file.data)

  // Return the public URL and metadata
  return {
    name: file.filename,
    url: `/uploads/${uniqueFilename}`,
    type: file.type || ext.replace('.', ''),
    size: file.data.length
  }
})
