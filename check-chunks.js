const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkChunks() {
  // 查找最新的文件
  const file = await prisma.file.findFirst({
    where: { filename: '高灯科技简介.pdf' },
    orderBy: { createdAt: 'desc' }
  })

  if (!file) {
    console.log('❌ File not found')
    return
  }

  console.log('📄 File:', file.filename)
  console.log('   ID:', file.id)
  console.log('   Status:', file.status)
  console.log('   Text length:', file.extractedText?.length || 0)

  // 查找对应的chunks
  const chunks = await prisma.fileChunk.findMany({
    where: { fileId: file.id }
  })

  console.log('\n📦 FileChunks:', chunks.length)
  if (chunks.length > 0) {
    console.log('   First chunk preview:', chunks[0].content.substring(0, 100))
  } else {
    console.log('   ⚠️  NO CHUNKS FOUND! This means MemMachine indexing failed.')
  }

  await prisma.$disconnect()
}

checkChunks().catch(console.error)
