const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')

const prisma = new PrismaClient()

const MEMMACHINE_URL = 'http://localhost:8081'
const ORG_ID = 'personal-assistant'
const PROJECT_ID = 'todd-assistant'

async function reindexFile(fileId) {
  console.log(`\n🔄 Reindexing file: ${fileId}`)

  // 1. 获取文件信息
  const file = await prisma.file.findUnique({
    where: { id: fileId }
  })

  if (!file) {
    console.error('❌ File not found')
    return
  }

  console.log(`📄 File: ${file.filename}`)
  console.log(`   Text length: ${file.extractedText?.length || 0}`)

  // 2. 获取所有chunks
  const chunks = await prisma.fileChunk.findMany({
    where: { fileId: file.id },
    orderBy: { chunkIndex: 'asc' }
  })

  console.log(`📦 Found ${chunks.length} chunks`)

  if (chunks.length === 0) {
    console.log('⚠️  No chunks to index')
    return
  }

  // 3. 准备MemMachine请求
  const messages = chunks.map((chunk, index) => ({
    content: `[PDF文档: ${file.filename} - 第${index + 1}块]\n${chunk.content}`,
    role: 'user',
    producer: file.userId,
    produced_for: 'assistant',
    metadata: {
      fileId: file.id,
      chunkIndex: index.toString(),
      type: 'pdf_chunk',
      filename: file.filename,
    }
  }))

  console.log(`\n📤 Sending ${messages.length} memories to MemMachine...`)
  console.log(`   URL: ${MEMMACHINE_URL}/api/v2/memories`)
  console.log(`   Org: ${ORG_ID}`)
  console.log(`   Project: ${PROJECT_ID}`)

  try {
    const response = await fetch(`${MEMMACHINE_URL}/api/v2/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: ORG_ID,
        project_id: PROJECT_ID,
        messages
      })
    })

    console.log(`\n📡 Response status: ${response.status}`)

    if (!response.ok) {
      const text = await response.text()
      console.error('❌ MemMachine error response:')
      console.error(text)
      return
    }

    const result = await response.json()
    console.log('✅ Successfully indexed to MemMachine!')
    console.log('   Response:', JSON.stringify(result, null, 2))

  } catch (error) {
    console.error('❌ Error calling MemMachine:', error.message)
    console.error('   Stack:', error.stack)
  }

}

// 批量重新索引所有待处理的文件
async function reindexAllFiles() {
  const fileIds = [
    'dae294aa-e878-436f-b67b-c30032c84bc9',  // 2021.9国庆节放假安全协议书.pdf
    '2717d05d-353d-42e6-96a4-ee851b75b3ad',  // 茶青卡和商品标.pdf
    'df1717f9-7283-4288-8a36-1d93bb17a3b0',  // 茶青卡和商品标.pdf (duplicate)
    'd84497a7-ddf2-4b99-aedb-54776049f3ad'   // 2021.9国庆节放假安全协议书.pdf (duplicate)
  ]

  console.log(`📋 Starting batch reindex of ${fileIds.length} files...\n`)

  for (const fileId of fileIds) {
    await reindexFile(fileId)
  }

  console.log('\n✅ Batch reindex complete!')
  await prisma.$disconnect()
}

reindexAllFiles().catch(console.error)
