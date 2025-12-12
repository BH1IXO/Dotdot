const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')

const prisma = new PrismaClient()
const MEMMACHINE_URL = 'http://localhost:8081'
const ORG_ID = 'personal-assistant'
const USER_UUID = 'a7962149-6ace-4910-812d-e1ed7d3b8ac4' // todd8
const PROJECT_ID = `todd-assistant-${USER_UUID}`

async function checkUserMemories() {
  const userId = 'a7962149-6ace-4910-812d-e1ed7d3b8ac4' // todd8's UUID

  console.log(`\n🔍 Checking memories for user: ${userId}\n`)

  // 1. 检查数据库中的对话消息
  console.log('📊 Database Messages:')
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true
    }
  })

  console.log(`   Found ${messages.length} messages`)
  messages.forEach((msg, idx) => {
    console.log(`\n   ${idx + 1}. [${msg.role}] ${msg.createdAt.toISOString()}`)
    console.log(`      ${msg.content.substring(0, 100)}...`)
  })

  // 2. 检查MemMachine中的记忆
  console.log('\n\n🧠 MemMachine Memories:')
  try {
    const response = await fetch(`${MEMMACHINE_URL}/api/v2/memories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: ORG_ID,
        project_id: PROJECT_ID,
        query: '',
        top_k: 50,
        filters: {
          producer: userId
        }
      })
    })

    if (!response.ok) {
      console.error(`   ❌ Search failed: ${response.status}`)
      const text = await response.text()
      console.error(`   ${text}`)
    } else {
      const data = await response.json()
      console.log(`   Found ${data.results?.length || 0} memories`)

      if (data.results && data.results.length > 0) {
        data.results.forEach((mem, idx) => {
          console.log(`\n   ${idx + 1}. UID: ${mem.uid}`)
          console.log(`      Content: ${mem.content.substring(0, 150)}...`)
          console.log(`      Metadata:`, mem.metadata)
        })
      }
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message)
  }

  await prisma.$disconnect()
}

checkUserMemories().catch(console.error)
