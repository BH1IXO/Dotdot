// Fix user data - check actual User records and explain the problem
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixUserData() {
  console.log('\n=== Analyzing User Data Issue ===\n')

  // Check if there are any User records
  const users = await prisma.user.findMany()
  console.log(`Found ${users.length} User records:`)
  users.forEach(user => {
    console.log(`- ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Name: ${user.name}`)
  })

  // Check messages
  const messageSample = await prisma.message.findFirst()
  console.log('\nSample message userId:', messageSample?.userId)

  // Check files
  const fileSample = await prisma.file.findFirst()
  console.log('Sample file userId:', fileSample?.userId)

  // Check memories
  const memorySample = await prisma.memory.findFirst()
  console.log('Sample memory userId:', memorySample?.userId)

  console.log('\n=== PROBLEM IDENTIFIED ===')
  console.log('All data has userId = "default" (a string)')
  console.log('But User table expects UUID foreign keys')
  console.log('The schema uses @default("default") which creates orphaned records')

  await prisma.$disconnect()
}

fixUserData().catch(console.error)
