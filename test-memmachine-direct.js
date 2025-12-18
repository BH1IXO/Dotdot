const fetch = require('node-fetch')

const MEMMACHINE_URL = 'http://123.57.28.44:8081'
const ORG_ID = 'personal-assistant'
const USER_UUID = '8fe2b191-c205-489a-8763-174d60520ebd' // daqiao
const PROJECT_ID = `todd-assistant-${USER_UUID}`

async function testMemMachineSearch() {
  console.log(`\n🔍 Testing MemMachine search for Daqiao...`)
  console.log(`   URL: ${MEMMACHINE_URL}/api/v2/memories/search`)
  console.log(`   Org: ${ORG_ID}`)
  console.log(`   Project: ${PROJECT_ID}`)

  try {
    // Test 1: Search for food preferences
    console.log(`\n📤 Test 1: 搜索 "我爱吃什么"...`)
    const searchResponse1 = await fetch(`${MEMMACHINE_URL}/api/v2/memories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: ORG_ID,
        project_id: PROJECT_ID,
        query: '我爱吃什么',
        top_k: 15
      })
    })

    if (!searchResponse1.ok) {
      console.error('❌ Search error:', searchResponse1.status)
      const text = await searchResponse1.text()
      console.error(text)
      return
    }

    const searchResult1 = await searchResponse1.json()
    const ltm1 = searchResult1.content?.episodic_memory?.long_term_memory?.episodes || []
    const stm1 = searchResult1.content?.episodic_memory?.short_term_memory?.episodes || []
    const all1 = [...ltm1, ...stm1]

    console.log(`\n✅ 返回了 ${all1.length} 条记忆`)

    all1.slice(0, 5).forEach((ep, i) => {
      console.log(`\n[${i+1}] 相似度: ${ep.similarity_score !== undefined ? ep.similarity_score.toFixed(3) : '无'}`)
      console.log(`    UID: ${ep.uid || '无'}`)
      console.log(`    内容: ${ep.content?.substring(0, 100)}...`)
    })

    // Show first episode structure
    if (all1.length > 0) {
      console.log(`\n\n=== 第一条记忆的完整结构 ===`)
      console.log(JSON.stringify(all1[0], null, 2).substring(0, 800))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('   Stack:', error.stack)
  }
}

testMemMachineSearch().catch(console.error)
