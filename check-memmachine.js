const fetch = require('node-fetch');

async function checkMemMachine() {
  const MEMMACHINE_URL = 'http://localhost:8099';
  const userId = 'default';

  try {
    console.log('🔍 Checking MemMachine memories for user:', userId);

    // Query all memories
    const response = await fetch(`${MEMMACHINE_URL}/v2/memories/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        query: '',
        top_k: 100
      })
    });

    if (!response.ok) {
      console.error('❌ MemMachine query failed:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('\n📊 Total memories found:', data.results?.length || 0);

    if (data.results && data.results.length > 0) {
      console.log('\n📋 Memory details:\n');

      // Count by type
      const byType = {};
      data.results.forEach(mem => {
        const metadata = mem.metadata || {};
        const type = metadata.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      });

      console.log('By type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log('\n📝 Recent memories:');
      data.results.slice(0, 10).forEach((mem, idx) => {
        const metadata = mem.metadata || {};
        console.log(`\n${idx + 1}. Type: ${metadata.type || 'unknown'}`);
        console.log(`   File: ${metadata.filename || 'N/A'}`);
        console.log(`   Content preview: ${mem.content.substring(0, 100)}...`);
        console.log(`   Score: ${mem.score}`);
      });
    } else {
      console.log('⚠️  No memories found in MemMachine!');
    }

  } catch (error) {
    console.error('❌ Error checking MemMachine:', error.message);
  }
}

checkMemMachine().catch(console.error);
