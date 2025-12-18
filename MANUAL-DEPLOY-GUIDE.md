# 服务器端手动部署指南

## 📋 部署步骤

直接在服务器上执行以下命令，一步一步完成部署。

---

## 第1步：连接服务器

```bash
ssh root@123.57.28.44
# 密码: Zen721ViaNet
```

---

## 第2步：停止当前服务

```bash
# 停止所有node进程
killall -9 node 2>/dev/null
fuser -k 3000/tcp 2>/dev/null

# 等待3秒
sleep 3

# 确认服务已停止
ps aux | grep node
netstat -tlnp | grep 3000
```

**预期结果**: 应该没有node进程和3000端口监听

---

## 第3步：拉取最新代码

```bash
# 进入源代码目录
cd /home/PersonalAssitant/personal-assistant

# 查看当前状态
git status
git log -1 --oneline

# 拉取最新代码
git pull origin main

# 确认最新commit（应该是 82f9639 修复HTTP环境下剪贴板复制功能）
git log -1 --oneline
```

**预期结果**: 应该看到最新的commit是关于clipboard fix的

---

## 第4步：安装依赖（如果需要）

```bash
# 如果package.json有更新，运行这个
npm install

# 否则跳过这一步
```

---

## 第5步：清理旧构建

```bash
# 删除旧的构建文件
rm -rf /home/PersonalAssitant/personal-assistant/.next

# 确认删除
ls -la /home/PersonalAssitant/personal-assistant/.next 2>/dev/null || echo "已清理"
```

---

## 第6步：重新构建项目

```bash
cd /home/PersonalAssitant/personal-assistant

# 设置环境变量
export MEMMACHINE_API_URL=http://localhost:8081

# 执行构建
npm run build

# 这一步会花费2-5分钟，请耐心等待
# 你会看到很多输出，最后应该显示 "✓ Compiled successfully"
```

**预期结果**: 构建成功，出现绿色的"Compiled successfully"消息

---

## 第7步：检查构建结果

```bash
# 查看BUILD_ID
cat /home/PersonalAssitant/personal-assistant/.next/BUILD_ID

# 查看构建的文件
ls -lh /home/PersonalAssitant/personal-assistant/.next/static/chunks/*.js | head -5

# 验证clipboard代码存在
grep -l '链接已复制' /home/PersonalAssitant/personal-assistant/.next/static/chunks/*.js | head -3

# 应该找到至少1个文件
```

**预期结果**: 应该看到新的BUILD_ID和包含clipboard代码的文件

---

## 第8步：清理部署目录

```bash
# 删除旧的部署文件
rm -rf /home/PersonalAssitant/deploy-package/.next/static
rm -rf /home/PersonalAssitant/deploy-package/.next/server
rm -f /home/PersonalAssitant/deploy-package/.next/BUILD_ID

# 确认删除
ls -la /home/PersonalAssitant/deploy-package/.next/
```

---

## 第9步：复制新构建到部署目录

```bash
# 复制static目录
cp -r /home/PersonalAssitant/personal-assistant/.next/static /home/PersonalAssitant/deploy-package/.next/

# 复制server目录
cp -r /home/PersonalAssitant/personal-assistant/.next/server /home/PersonalAssitant/deploy-package/.next/

# 复制BUILD_ID
cp /home/PersonalAssitant/personal-assistant/.next/BUILD_ID /home/PersonalAssitant/deploy-package/.next/

# 复制standalone目录（如果有更新）
# cp -r /home/PersonalAssitant/personal-assistant/.next/standalone/* /home/PersonalAssitant/deploy-package/.next/standalone/

echo "✅ 文件复制完成"
```

---

## 第10步：验证部署文件

```bash
# 检查BUILD_ID是否一致
echo "源代码 BUILD_ID:"
cat /home/PersonalAssitant/personal-assistant/.next/BUILD_ID

echo ""
echo "部署目录 BUILD_ID:"
cat /home/PersonalAssitant/deploy-package/.next/BUILD_ID

# 检查文件数量
echo ""
echo "部署的 static chunks 数量:"
ls -1 /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js | wc -l

# 验证clipboard代码
echo ""
echo "验证clipboard修复代码:"
grep -l '链接已复制' /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js | head -3
```

**预期结果**: 两个BUILD_ID应该一致，应该找到包含clipboard代码的文件

---

## 第11步：启动服务

```bash
cd /home/PersonalAssitant/deploy-package

# 设置环境变量
export MEMMACHINE_API_URL=http://localhost:8081

# 后台启动服务
nohup node server.js > /tmp/next-server.log 2>&1 &

echo "✅ 服务已启动"

# 等待服务启动
sleep 5
```

---

## 第12步：验证服务运行

```bash
# 检查进程
ps aux | grep 'node server.js' | grep -v grep

# 检查端口
netstat -tlnp | grep 3000

# 测试API
curl -s http://localhost:3000/api/auth/me

# 查看日志（最后30行）
tail -30 /tmp/next-server.log
```

**预期结果**:
- 应该看到node进程在运行
- 端口3000应该在监听
- API应该返回JSON（即使是错误信息也没关系）
- 日志中不应该有严重错误

---

## 第13步：外部访问测试

在你的浏览器中访问：
```
http://123.57.28.44:3000
```

然后：
1. 登录系统
2. 进入"访客链接"页面
3. 点击"复制链接"按钮
4. 应该弹出"链接已复制!"的提示

**如果还是失败，强制刷新浏览器**: `Ctrl + Shift + R`

---

## 🔍 故障排查

### 如果服务无法启动：

```bash
# 查看完整日志
cat /tmp/next-server.log

# 检查端口占用
lsof -i :3000

# 检查数据库文件
ls -lh /home/PersonalAssitant/deploy-package/prisma/dev.db

# 检查环境变量
cat /home/PersonalAssitant/deploy-package/.env
```

### 如果clipboard还是不工作：

```bash
# 在包含clipboard代码的chunk中搜索完整的函数
grep -A 20 'navigator.clipboard' /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | head -30

# 检查浏览器控制台错误
# 按F12打开开发者工具，查看Console标签页的错误信息
```

---

## 📝 部署检查清单

完成以下检查：

- [ ] 服务器连接成功
- [ ] 旧服务已停止
- [ ] 代码已更新到最新commit (82f9639)
- [ ] npm依赖已安装
- [ ] 项目构建成功
- [ ] 构建文件已复制到部署目录
- [ ] BUILD_ID一致
- [ ] 找到包含clipboard代码的文件
- [ ] 服务启动成功
- [ ] 端口3000正在监听
- [ ] API响应正常
- [ ] 浏览器可以访问
- [ ] clipboard功能正常

---

## 💡 快速重启命令

如果只需要重启服务：

```bash
killall -9 node 2>/dev/null
sleep 3
cd /home/PersonalAssitant/deploy-package
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
sleep 5
ps aux | grep node
netstat -tlnp | grep 3000
```

---

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. 在哪一步遇到问题
2. 具体的错误信息
3. 日志内容（`tail -50 /tmp/next-server.log`）
