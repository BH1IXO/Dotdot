const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showUsersDetail() {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            messages: true,
            files: true,
            memories: true,
            sessions: true,
            settings: true
          }
        },
        profile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📊 用户详细信息表');
    console.log('='.repeat(120));
    console.log('');

    if (users.length === 0) {
      console.log('暂无注册用户\n');
    } else {
      // 表头
      console.log('序号 | 用户ID (前8位) | 邮箱                 | 昵称      | 消息 | 文件 | 记忆 | 会话 | 设置 | 画像 | 注册时间            | 更新时间');
      console.log('-'.repeat(120));

      users.forEach((user, index) => {
        const shortId = user.id.substring(0, 8);
        const email = user.email.padEnd(20, ' ');
        const name = (user.name || '未设置').padEnd(10, ' ');
        const messages = String(user._count.messages).padStart(4, ' ');
        const files = String(user._count.files).padStart(4, ' ');
        const memories = String(user._count.memories).padStart(4, ' ');
        const sessions = String(user._count.sessions).padStart(4, ' ');
        const settings = String(user._count.settings).padStart(4, ' ');
        const hasProfile = user.profile ? '✓' : '✗';
        const createdAt = new Date(user.createdAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        const updatedAt = new Date(user.updatedAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        console.log(
          `${String(index + 1).padStart(3, ' ')}  | ${shortId}       | ${email} | ${name} | ${messages} | ${files} | ${memories} | ${sessions} | ${settings} |  ${hasProfile}   | ${createdAt} | ${updatedAt}`
        );
      });

      console.log('-'.repeat(120));
      console.log(`\n总计: ${users.length} 个用户`);

      // 统计总数
      const totalMessages = users.reduce((sum, u) => sum + u._count.messages, 0);
      const totalFiles = users.reduce((sum, u) => sum + u._count.files, 0);
      const totalMemories = users.reduce((sum, u) => sum + u._count.memories, 0);
      const totalSessions = users.reduce((sum, u) => sum + u._count.sessions, 0);

      console.log(`\n数据统计:`);
      console.log(`  - 总消息数: ${totalMessages} 条`);
      console.log(`  - 总文件数: ${totalFiles} 个`);
      console.log(`  - 总记忆数: ${totalMemories} 条`);
      console.log(`  - 总会话数: ${totalSessions} 个`);
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n完整用户ID列表:');
    console.log('-'.repeat(120));
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      if (user.profile) {
        console.log(`   画像: ${user.profile.name || '未命名'}`);
      }
    });
    console.log('='.repeat(120) + '\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('查询失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

showUsersDetail();
