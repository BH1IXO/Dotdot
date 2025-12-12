const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
            files: true,
            memories: true,
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📊 已注册用户列表:');
    console.log('='.repeat(80));

    if (users.length === 0) {
      console.log('\n暂无注册用户\n');
    } else {
      users.forEach((user, index) => {
        console.log(`\n【用户 ${index + 1}】`);
        console.log(`  ID:       ${user.id}`);
        console.log(`  邮箱:     ${user.email}`);
        console.log(`  昵称:     ${user.name || '未设置'}`);
        console.log(`  注册时间: ${user.createdAt.toLocaleString('zh-CN')}`);
        console.log(`  更新时间: ${user.updatedAt.toLocaleString('zh-CN')}`);
        console.log(`  数据统计:`);
        console.log(`    - 消息数: ${user._count.messages}`);
        console.log(`    - 文件数: ${user._count.files}`);
        console.log(`    - 记忆数: ${user._count.memories}`);
        console.log(`    - 会话数: ${user._count.sessions}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log(`总计: ${users.length} 个用户\n`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('查询失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

listUsers();
