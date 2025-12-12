const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUsers() {
  try {
    // 要删除的邮箱列表
    const emailsToDelete = [
      'todd7@zen7.com',
      'todd6@zen7.com',
      'todd5@zen7.com',
      'todd4@zen7.com'
    ];

    console.log('\n🗑️  准备删除以下用户:');
    console.log('='.repeat(80));

    // 先查询这些用户的信息
    const usersToDelete = await prisma.user.findMany({
      where: {
        email: {
          in: emailsToDelete
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        _count: {
          select: {
            messages: true,
            files: true,
            memories: true,
            sessions: true
          }
        }
      }
    });

    if (usersToDelete.length === 0) {
      console.log('\n未找到要删除的用户\n');
      await prisma.$disconnect();
      return;
    }

    // 显示要删除的用户信息
    usersToDelete.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email} (${user.name})`);
      console.log(`   - 消息: ${user._count.messages} 条`);
      console.log(`   - 文件: ${user._count.files} 个`);
      console.log(`   - 记忆: ${user._count.memories} 条`);
      console.log(`   - 会话: ${user._count.sessions} 个`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  开始删除用户及其所有相关数据...\n');

    // 删除用户 (因为设置了 onDelete: Cascade,相关数据会自动删除)
    const deleteResult = await prisma.user.deleteMany({
      where: {
        email: {
          in: emailsToDelete
        }
      }
    });

    console.log(`✅ 成功删除 ${deleteResult.count} 个用户及其所有相关数据\n`);
    console.log('删除的数据包括:');
    console.log('  - 用户账号');
    console.log('  - 所有消息记录 (自动级联删除)');
    console.log('  - 所有上传文件 (自动级联删除)');
    console.log('  - 所有记忆数据 (自动级联删除)');
    console.log('  - 所有会话数据 (自动级联删除)');
    console.log('  - 所有设置数据 (自动级联删除)');
    console.log('  - 用户画像数据 (自动级联删除)\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 删除失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

deleteUsers();
