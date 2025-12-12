// Check the latest uploaded file details
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkLatestFile() {
  console.log('\n=== Checking Latest File ===\n')

  // Get the most recent file
  const latestFile = await prisma.file.findFirst({
    where: { userId: 'default' },
    orderBy: { createdAt: 'desc' },
  })

  if (!latestFile) {
    console.log('No files found')
    return
  }

  console.log('Latest File:')
  console.log(`- Filename: ${latestFile.filename}`)
  console.log(`- Created: ${latestFile.createdAt}`)
  console.log(`- Size: ${latestFile.size} bytes`)
  console.log(`- Status: ${latestFile.status}`)
  console.log(`- Extracted Text Length: ${latestFile.extractedText?.length || 0} chars`)

  if (latestFile.extractedText) {
    console.log(`\nFirst 500 chars of extracted text:`)
    console.log(latestFile.extractedText.substring(0, 500))
  }

  // Check if there are chunks for this file
  const chunks = await prisma.fileChunk.findMany({
    where: { fileId: latestFile.id },
  })

  console.log(`\nTotal chunks: ${chunks.length}`)

  if (chunks.length > 0) {
    console.log(`\nFirst chunk:`)
    console.log(`- Text length: ${chunks[0].chunkText?.length || 0}`)
    console.log(`- Content: ${chunks[0].chunkText?.substring(0, 200)}...`)
  }

  await prisma.$disconnect()
}

checkLatestFile().catch(console.error)
