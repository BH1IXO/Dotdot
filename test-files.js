const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testFileIndexing() {
  console.log('📊 Checking file indexing status...\n')

  try {
    // 检查文件数量
    const fileCount = await prisma.file.count()
    console.log(`📁 Total files in database: ${fileCount}`)

    if (fileCount > 0) {
      // 获取最近的文件
      const recentFiles = await prisma.file.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          chunks: true
        }
      })

      console.log('\n📄 Recent files:')
      recentFiles.forEach((file, idx) => {
        console.log(`\n${idx + 1}. ${file.filename}`)
        console.log(`   Type: ${file.mimetype}`)
        console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`)
        console.log(`   Status: ${file.status}`)
        console.log(`   Chunks: ${file.chunks.length}`)
        if (file.description) {
          console.log(`   Description: ${file.description}`)
        }
        if (file.extractedText) {
          console.log(`   Extracted text: ${file.extractedText.slice(0, 100)}...`)
        }
      })
    } else {
      console.log('\n⚠️  No files found in database yet')
      console.log('💡 Try uploading a file through the web interface')
    }

    // 检查 FileChunk 数量
    const chunkCount = await prisma.fileChunk.count()
    console.log(`\n📦 Total file chunks: ${chunkCount}`)

    console.log('\n✅ File indexing test completed')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFileIndexing()
