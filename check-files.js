const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFiles() {
  const files = await prisma.file.findMany({
    where: { userId: 'default' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      filename: true,
      createdAt: true,
      status: true,
      extractedText: true
    }
  })

  console.log('最近5个文件:\n')
  files.forEach(f => {
    console.log(`ID: ${f.id}`)
    console.log(`Filename: ${f.filename}`)
    console.log(`Status: ${f.status}`)
    console.log(`Created: ${f.createdAt}`)
    console.log(`Text length: ${f.extractedText?.length || 0}`)
    if (f.extractedText) {
      console.log(`First 100 chars: ${f.extractedText.substring(0, 100)}`)
    }
    console.log('---\n')
  })

  await prisma.$disconnect()
}

checkFiles().catch(console.error)
