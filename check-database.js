// Check database content
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('\n=== Checking Database ===\n')

  // Check users
  const users = await prisma.user.findMany()
  console.log('Users in database:')
  users.forEach(user => {
    console.log(`- ${user.userId} (${user.username})`)
  })

  // Check messages count per user
  console.log('\nMessage count per user:')
  for (const user of users) {
    const count = await prisma.message.count({
      where: { userId: user.userId }
    })
    console.log(`- ${user.userId}: ${count} messages`)
  }

  // Check memory count per user
  console.log('\nMemory count per user:')
  for (const user of users) {
    const count = await prisma.memory.count({
      where: { userId: user.userId }
    })
    console.log(`- ${user.userId}: ${count} memories`)
  }

  // Check files per user
  console.log('\nFiles per user:')
  for (const user of users) {
    const files = await prisma.file.findMany({
      where: { userId: user.userId },
      select: { filename: true, extractedText: true }
    })
    console.log(`- ${user.userId}: ${files.length} files`)
    files.forEach(file => {
      console.log(`  - ${file.filename} (text: ${file.extractedText ? 'YES' : 'NO'})`)
    })
  }

  // Sample some messages from default user
  console.log('\nSample messages from "default" user:')
  const defaultMessages = await prisma.message.findMany({
    where: { userId: 'default' },
    take: 5,
    orderBy: { createdAt: 'desc' }
  })
  defaultMessages.forEach((msg, i) => {
    console.log(`${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`)
  })

  await prisma.$disconnect()
}

checkDatabase().catch(console.error)
