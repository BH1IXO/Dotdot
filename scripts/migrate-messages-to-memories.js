const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateMessages() {
  try {
    console.log('正在检查 Message 表中的数据...')

    // 获取所有消息
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' }
    })

    console.log(`找到 ${messages.length} 条旧记录`)

    if (messages.length === 0) {
      console.log('没有需要迁移的数据')
      return
    }

    // 检查Memory表中是否已有数据
    const existingMemories = await prisma.memory.count()
    console.log(`Memory 表中已有 ${existingMemories} 条记录`)

    if (existingMemories > 0) {
      console.log('Memory 表中已有数据，是否继续迁移？')
      console.log('如果继续，旧的 Message 记录将被转换并添加到 Memory 表')
    }

    // 迁移数据
    let migratedCount = 0
    for (const message of messages) {
      try {
        // 确定类型
        let type = 'conversation'
        let content = message.content

        // 检查是否有类型标记
        const typeMatch = content.match(/^\[(conversation|knowledge|preference|fact)\]\s*/)
        if (typeMatch) {
          type = typeMatch[1]
          content = content.replace(typeMatch[0], '').trim()
        } else {
          // 根据角色判断
          type = message.role === 'user' ? 'conversation' : 'knowledge'
        }

        // 创建记忆
        await prisma.memory.create({
          data: {
            userId: 'default',
            type: type,
            content: content,
            metadata: JSON.stringify({
              source: 'migration',
              originalRole: message.role,
              originalId: message.id
            }),
            createdAt: message.createdAt
          }
        })

        migratedCount++
      } catch (error) {
        console.error(`迁移消息 ${message.id} 失败:`, error.message)
      }
    }

    console.log(`成功迁移 ${migratedCount} 条记录`)
    console.log('迁移完成！旧的 Message 记录仍然保留在数据库中')
    console.log('如果您确认新系统工作正常，可以手动删除 Message 表')

  } catch (error) {
    console.error('迁移失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateMessages()
