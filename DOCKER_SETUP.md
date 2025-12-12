# 🐳 Docker 镜像加速配置指南

## ⚠️ 问题描述
由于网络问题，无法从 Docker Hub 拉取镜像，导致 MemMachine 服务无法启动。

## ✅ 解决方案：配置国内镜像加速

### 步骤 1：打开 Docker Desktop 设置

1. 找到任务栏的 Docker 图标（鲸鱼）
2. 右键点击
3. 选择 "Settings" 或 "设置"

### 步骤 2：配置镜像加速器

1. 在左侧菜单选择 **"Docker Engine"**
2. 你会看到一个 JSON 编辑器
3. 将以下配置 **添加或合并** 到现有配置中：

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerhub.azk8s.cn",
    "https://docker.mirrors.ustc.edu.cn",
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ]
}
```

**重要提示：**
- 如果原来有配置，只需添加 `"registry-mirrors"` 部分
- 确保 JSON 格式正确（逗号、括号等）

### 步骤 3：应用配置

1. 点击右下角 **"Apply & Restart"** 按钮
2. 等待 Docker Desktop 重启（约 30 秒）

### 步骤 4：验证配置

打开命令行，运行：

```bash
docker info | grep -i "registry mirror"
```

应该能看到配置的镜像地址。

## 🚀 启动 MemMachine

配置完成后，在项目目录运行：

```bash
cd E:\Personal_Todd\MemMachine
docker-compose up -d
```

## 📝 预期结果

成功启动后，应该看到：

```
✔ Network memmachine-network       Created
✔ Container memmachine-postgres    Started
✔ Container memmachine-neo4j       Started
✔ Container memmachine-app         Started
```

## 🔍 健康检查

等待约 60 秒后，测试服务：

```bash
curl http://localhost:8080/health
```

应该返回健康状态。

## ❌ 如果还是失败

### 备选方案 1：使用代理

在 Docker Desktop 设置中：
1. 选择 "Resources" → "Proxies"
2. 启用 "Manual proxy configuration"
3. 输入你的代理地址

### 备选方案 2：手动下载镜像

如果有 VPN 或其他可访问 Docker Hub 的机器：

```bash
# 在可访问的机器上
docker pull postgres:16
docker pull neo4j:5.15.0

# 导出镜像
docker save postgres:16 -o postgres.tar
docker save neo4j:5.15.0 -o neo4j.tar

# 复制文件到本机后导入
docker load -i postgres.tar
docker load -i neo4j.tar
```

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. Docker Desktop 版本
2. 错误信息截图
3. `docker info` 输出

我会帮你诊断和解决！
