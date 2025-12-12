const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFile() {
  const file = await prisma.file.findUnique({
    where: { id: '2717d05d-353d-42e6-96a4-ee851b75b3ad' }
  })

  console.log('File:', file.filename)
  console.log('Text length:', file.extractedText?.length)
  console.log('First 300 chars:', file.extractedText?.substring(0, 300))

  await prisma.$disconnect()
}

checkFile().catch(console.error)
