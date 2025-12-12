// 页面导航
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewName = item.dataset.view;

        // 更新导航状态
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // 切换视图
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
    });
});

// 聊天功能
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-message');
const messagesContainer = document.getElementById('messages');

// 自动调整输入框高度
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// 发送消息
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // 添加用户消息
    addMessage(message, 'user');

    // 清空输入框
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 模拟AI回复
    setTimeout(() => {
        const responses = {
            '帮我找去年过年的全家福照片': '我在你的照片库中找到了去年春节的全家福照片！\n\n📸 找到 1 张匹配照片：\n• 全家福_2024春节.jpg\n• 拍摄时间：2024年2月10日\n• 位置：E:\\Photos\\2024\\春节\n• 大小：2.3 MB\n\n这张照片拍摄于除夕夜，所有家人都在。需要我帮你打开或分享这张照片吗？',

            '我去年写的中美竞争文章里说了什么？': '我找到了你在2024年3月写的《中美竞争格局思考》这篇文章。让我为你总结主要观点：\n\n📝 核心观点：\n1. 认为中美竞争已经从单纯的经济竞争转向全方位的战略竞争\n2. 强调科技自主创新的重要性，特别是半导体和AI领域\n3. 提出中国需要在"规则制定"层面提升话语权\n4. 分析了供应链重构对全球化的影响\n\n你还特别强调了一个观点："竞争不等于对抗，合作共赢仍是大势所趋"。\n\n需要我把完整文章发给你吗？',

            '今晚适合喝酒吗？': '根据我对你情况的了解，让我给你一些建议：\n\n⚠️ 今晚不太建议喝酒，原因如下：\n\n1. 📅 明天是工作日，你通常早上8点有晨会\n2. 😴 你最近几天睡眠质量不太好（平均只有6小时）\n3. 💊 你上周提到肠胃有些不舒服\n4. 🏃 你计划明早去健身房\n\n如果你确实想放松一下，我建议：\n• 少量饮用（1-2杯红酒）\n• 提前准备解酒物品\n• 确保10点前休息\n• 或者改成周五晚上约朋友一起\n\n你觉得呢？需要我推荐一些其他的放松方式吗？'
        };

        const response = responses[message] || `收到你的消息："${message}"\n\n这是一个演示界面，实际的AI功能需要接入真实的AI模型（如Claude API）。\n\n在完整版本中，我会：\n1. 理解你的问题\n2. 搜索相关的记忆和文件\n3. 基于上下文给出个性化回答\n4. 学习并记住这次对话`;

        addMessage(response, 'assistant');
    }, 1000);
}

// 添加消息到聊天界面
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = text.replace(/\n/g, '<br>');

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送按钮点击事件
sendButton.addEventListener('click', sendMessage);

// 回车发送消息
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 建议点击事件
const suggestions = document.querySelectorAll('.suggestion');
suggestions.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        messageInput.value = suggestion.textContent;
        messageInput.focus();
        messageInput.dispatchEvent(new Event('input'));
    });
});

// 新对话按钮
document.getElementById('new-chat').addEventListener('click', () => {
    if (confirm('确定要开始新对话吗？当前对话将被保存到记忆库。')) {
        // 保留欢迎消息，清除其他消息
        const welcomeMessage = messagesContainer.querySelector('.message.assistant');
        messagesContainer.innerHTML = '';
        messagesContainer.appendChild(welcomeMessage.cloneNode(true));
    }
});

// 导出对话按钮
document.getElementById('export-chat').addEventListener('click', () => {
    const messages = Array.from(messagesContainer.querySelectorAll('.message'));
    const chatContent = messages.map(msg => {
        const sender = msg.classList.contains('user') ? '你' : 'AI助理';
        const text = msg.querySelector('.message-text').textContent;
        const time = msg.querySelector('.message-time').textContent;
        return `[${time}] ${sender}: ${text}`;
    }).join('\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对话记录_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// 文件上传按钮（演示）
document.getElementById('attach-file').addEventListener('click', () => {
    alert('文件上传功能\n\n在完整版本中，你可以：\n• 上传文档（PDF, Word, TXT等）\n• 上传图片让AI分析\n• 上传音频/视频文件\n• 所有文件会被索引和学习');
});

// 记忆库卡片点击（演示）
document.addEventListener('click', (e) => {
    if (e.target.closest('.memory-card')) {
        const card = e.target.closest('.memory-card');
        const content = card.querySelector('.memory-content').textContent;
        alert('记忆详情\n\n' + content + '\n\n[在完整版本中，这里会显示完整的记忆详情和相关联的其他记忆]');
    }
});

// 文件卡片点击（演示）
document.addEventListener('click', (e) => {
    if (e.target.closest('.file-card')) {
        const card = e.target.closest('.file-card');
        const fileName = card.querySelector('.file-name').textContent;
        alert('文件操作\n\n' + fileName + '\n\n可用操作：\n• 查看文件内容\n• 向AI提问关于此文件\n• 下载\n• 删除');
    }
});

// 知识分类卡片点击（演示）
document.addEventListener('click', (e) => {
    if (e.target.closest('.category-card')) {
        const card = e.target.closest('.category-card');
        const title = card.querySelector('h3').textContent;
        alert('知识分类：' + title + '\n\n[在完整版本中，这里会显示该分类下的所有知识条目，支持搜索和筛选]');
    }
});

// 添加一些动态效果
document.addEventListener('DOMContentLoaded', () => {
    // 为卡片添加悬停效果
    const cards = document.querySelectorAll('.memory-card, .file-card, .category-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// 搜索框功能（演示）
const searchBoxes = document.querySelectorAll('.search-box');
searchBoxes.forEach(searchBox => {
    searchBox.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        console.log('搜索：', query);
        // 实际实现中这里会进行语义搜索
    });
});

// 模拟实时统计数据更新
function updateStats() {
    const stats = {
        conversations: Math.floor(Math.random() * 50) + 100,
        knowledge: Math.floor(Math.random() * 100) + 300,
        files: Math.floor(Math.random() * 500) + 1000
    };

    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 3) {
        statValues[0].textContent = stats.conversations;
        statValues[1].textContent = stats.knowledge;
        statValues[2].textContent = stats.files.toLocaleString();
    }
}

// 每30秒更新一次统计数据（仅作演示）
setInterval(updateStats, 30000);

// 欢迎提示
console.log('%c🤖 个人AI助理系统', 'font-size: 20px; color: #6366f1; font-weight: bold;');
console.log('%c这是一个演示界面，展示了个人AI助理的核心功能', 'font-size: 12px; color: #666;');
console.log('%c完整版本需要接入AI模型、向量数据库等后端服务', 'font-size: 12px; color: #666;');
