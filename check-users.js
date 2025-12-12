const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  console.log('\n👥 Checking all users in database:\n')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  console.log(`Found ${users.length} users:\n`)

  for (const user of users) {
    console.log(`📋 User: ${user.id}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   Email: ${user.email || 'N/A'}`)
    console.log(`   Created: ${user.createdAt}`)

    // 查询消息数量
    const messageCount = await prisma.message.count({
      where: { userId: user.id }
    })
    console.log(`   Messages: ${messageCount}`)
    console.log('')
  }

  await prisma.$disconnect()
}

checkUsers().catch(console.error)
