const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateLiutaoTokens() {
  try {
    // 首先查找刘涛用户
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: '刘涛' } },
          { email: { contains: 'liutao' } },
        ]
      }
    })

    console.log('找到的用户：', users)

    if (users.length === 0) {
      console.log('❌ 未找到刘涛用户')
      return
    }

    // 更新刘涛用户的Token
    for (const user of users) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { tokens: 99999999999 }
      })

      console.log(`✅ 已更新用户: ${updated.name || updated.email}`)
      console.log(`   邮箱: ${updated.email}`)
      console.log(`   新Token数量: ${updated.tokens}`)
    }

  } catch (error) {
    console.error('❌ 更新失败:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateLiutaoTokens()
