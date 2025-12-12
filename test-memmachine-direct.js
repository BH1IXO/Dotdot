const fetch = require('node-fetch')

const MEMMACHINE_URL = 'http://localhost:8081'
const ORG_ID = 'personal-assistant'
const USER_UUID = 'a7962149-6ace-4910-812d-e1ed7d3b8ac4' // todd8
const PROJECT_ID = `todd-assistant-${USER_UUID}`

async function testMemMachineAdd() {
  console.log(`\n🧪 Testing MemMachine direct add...`)
  console.log(`   URL: ${MEMMACHINE_URL}/api/v2/memories`)
  console.log(`   Org: ${ORG_ID}`)
  console.log(`   Project: ${PROJECT_ID}`)

  const testMessage = {
    content: `测试消息 - todd8 喜欢吃巧克力`,
    role: 'user',
    producer: USER_UUID,
    produced_for: 'assistant',
    metadata: {
      test: 'true',
      timestamp: new Date().toISOString()
    }
  }

  try {
    console.log(`\n📤 Sending test memory...`)
    const response = await fetch(`${MEMMACHINE_URL}/api/v2/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: ORG_ID,
        project_id: PROJECT_ID,
        messages: [testMessage]
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
    console.log('✅ Successfully added test memory to MemMachine!')
    console.log('   Response:', JSON.stringify(result, null, 2))

    // Now search for it
    console.log(`\n🔍 Searching for the test memory...`)
    const searchResponse = await fetch(`${MEMMACHINE_URL}/api/v2/memories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: ORG_ID,
        project_id: PROJECT_ID,
        query: '巧克力',
        top_k: 5,
        filters: {
          producer: USER_UUID
        }
      })
    })

    if (!searchResponse.ok) {
      const text = await searchResponse.text()
      console.error('❌ Search error:')
      console.error(text)
      return
    }

    const searchResult = await searchResponse.json()
    console.log('🔍 Search results:', JSON.stringify(searchResult, null, 2))

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('   Stack:', error.stack)
  }
}

testMemMachineAdd().catch(console.error)
