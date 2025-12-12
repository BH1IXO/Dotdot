const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createDefaultUser() {
  try {
    const hashedPassword = await bcrypt.hash('todd123', 10)

    const user = await prisma.user.upsert({
      where: { id: 'default' },
      update: {
        passwordHash: hashedPassword
      },
      create: {
        id: 'default',
        email: 'default@todd.com',
        passwordHash: hashedPassword,
        name: 'Todd (默认用户)'
      }
    })

    console.log('✅ 默认用户账号已创建!')
    console.log('邮箱: default@todd.com')
    console.log('密码: todd123')
    console.log('用户ID:', user.id)
  } catch (error) {
    console.error('❌ 创建失败:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createDefaultUser()
