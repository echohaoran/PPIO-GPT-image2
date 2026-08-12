# 成长中心菜品图生成

基于 PPIO GPT Image 2 API 的菜品图片生成工具，支持文生图、图生图、Inpaint 修复、Logo 生图。

## 项目结构

```
├── index.html              # 页面结构
├── css/style.css           # 样式（CSS 变量驱动）
├── js/
│   ├── app.js              # 主逻辑
│   ├── i18n.js             # 国际化引擎
│   └── locales/
│       ├── zh-CN.json      # 中文
│       └── en-US.json      # 英文
├── assets/
│   ├── logo_1.png ~ logo_5.png  # Logo 选项
│   └── all-logo.svg             # 源 Logo SVG
├── server.py               # Python 静态文件服务器（含配置注入）
├── .env.example            # 环境变量模板
├── Dockerfile              # Docker 镜像配置
├── docker-compose.yml      # Docker Compose 部署
├── nginx.conf              # Nginx 配置（可选）
└── deploy.sh               # 部署脚本
```

---

## 快速开始

```bash
# 1. 复制环境变量模板并填入你的 API Key
cp .env.example .env
# 编辑 .env，将 API_KEY=your_api_key_here 改为你的真实 Key

# 2. 启动服务
python3 server.py
```

访问 `http://localhost:8765` 即可使用。

> ⚠️ **必须通过 server.py 启动**，直接用浏览器打开 `index.html`（file:// 协议）无法加载配置。

---

## 部署

### 方式一：Docker Compose 一键部署（推荐）

```bash
# 将整个项目目录拷贝到云服务器
scp -r ./* user@server:/opt/dish-image-generator/

# SSH 登录服务器
ssh user@server

# 进入项目目录
cd /opt/dish-image-generator

# 一键启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

启动后访问 `http://服务器IP:8765`

### 开发环境服务器同步与部署

项目内置了开发环境同步脚本，适合把本地修改快速同步到局域网/测试机。

```bash
# 1. 配置开发环境服务器
cp .dev-server.env.example .dev-server.env

# 2. 首次初始化：远端 clone + 同步 .env + compose 启动
./scripts/devbox.sh bootstrap

# 3. 本地改完代码后，推送到开发环境服务器
./scripts/devbox.sh push

# 4. 在开发环境服务器重建并启动
./scripts/devbox.sh deploy

# 5. 如需把开发环境服务器上的改动拉回本地
./scripts/devbox.sh pull
```

`.dev-server.env` 关键配置项：

- `DEV_HOST`：开发环境服务器 IP
- `DEV_USER`：SSH 用户名
- `DEV_PORT`：SSH 端口，默认 `22`
- `DEV_PATH`：远端项目目录，默认 `/opt/PPIO-GPT-image2`
- `DEV_GIT_URL`：远端 clone 使用的仓库地址；留空时默认读取当前仓库 `origin`
- `DEV_SSH_PASS`：如果开发环境服务器仍使用密码登录，可填密码；已配置密钥时留空即可
- `DEV_SYNC_ENV`：是否同步本地 `.env` 到开发环境服务器，`1` 为同步

### 方式二：自定义端口

```bash
PORT=80 docker-compose up -d
```

如果部署机器访问 Docker Hub 较慢，可以在构建时覆盖基础镜像：

```bash
docker compose build \
  --build-arg PYTHON_BASE_IMAGE=swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/python:3.9-slim
```

### 方式三：直接运行 Python 服务器

```bash
# 安装依赖（无额外依赖，Python 3 自带）
python3 server.py

# 自定义端口
PORT=8080 python3 server.py
```

### 方式四：Nginx 部署

```bash
# 安装 Nginx
apt install nginx

# 复制配置
cp nginx.conf /etc/nginx/conf.d/dish-image-generator.conf

# 复制静态文件
cp -r ./* /usr/share/nginx/html/

# 重启 Nginx
systemctl restart nginx
```

---

## 使用说明

### 首次使用

1. 打开页面后，先确认左上角显示的 API 状态为「已配置 ✓」。若显示「未配置 ✗」，说明 `.env` 中 `API_KEY` 未设置。
2. 页面顶部有 4 个标签页：**Logo生图** | **文生图** | **图生图** | **修复**，点击切换不同生成模式。
3. 每个面板顶部都有「固定提示词」下拉菜单，可在「菜品摄影」和「海报描述」两种风格间切换，也可以手动编辑提示词内容。

### 1. Logo 生图（默认页面）

1. 在「固定提示词」下拉菜单选择风格（菜品摄影 / 海报描述）。
2. 在「当前Logo」下拉菜单选择一个预设 Logo，或选择「上传自定义Logo」。
3.（可选）上传「样品实拍」图，Logo 会自动合成到样品图上方。
4. 在「目标主题」输入框填写内容，如：红烧肉、提拉米苏、夏日饮品。
5. 选择尺寸和画质，点击「生成」。
6. 等待进度条完成，右侧显示生成结果。悬停图片可点击下载按钮保存。

### 2. 文生图

1. 在「固定提示词」下拉菜单选择风格。
2. 在「目标主题」输入框填写内容。
3. 选择尺寸和画质，点击「生成」。

### 3. 图生图

1. 在「固定提示词」下拉菜单选择风格。
2. 上传一张参考图（点击或拖拽）。
3. 在「目标主题」输入框填写内容，描述你希望生成的效果。
4. 选择尺寸和画质，点击「生成」。系统会基于参考图风格重新生成。

### 4. 修复（Inpaint）

1. 上传原图。
2. 用画笔在图片上涂抹需要修改的区域（红色标记），可通过滑块调整画笔大小。
3. 在「目标主题」输入框填写修复描述，如：把背景换成蓝色。
4. 点击「清除遮罩」可重画。选择尺寸和画质，点击「生成」。

### 5. 下载图片

鼠标悬停在生成的图片上，右上角会出现下载按钮，点击即可下载 PNG 文件。

### 6. 历史记录

右侧面板显示历史生成记录，点击可回看，支持单条删除和全部清空。历史记录保存在浏览器 localStorage 中，最多保留 100 条。

### 7. 语言切换

右上角下拉菜单可切换中文 / 英文，选择会保存在浏览器中。

### 8. 检查更新

右上角「检查更新」按钮会自动对比 Gitee 远程仓库的版本号。有更新时按钮显示红点，点击可查看版本详情并跳转更新。

### 快捷键

- **Ctrl/Cmd + Enter**：在输入框中按下可快速触发生成

---

## 配置说明

所有敏感配置通过 `.env` 文件管理，**不会提交到 Git 仓库**。

### 环境变量

| 变量名      | 说明              | 默认值                                          |
|------------|-------------------|------------------------------------------------|
| `API_KEY`  | PPIO API Key（必填） | 无                                              |
| `T2I_URL`  | 文生图 API 端点    | `https://api.ppio.com/v3/gpt-image-2-text-to-image` |
| `EDIT_URL` | 图生图 API 端点    | `https://api.ppio.com/v3/gpt-image-2-edit`          |
| `PORT`     | 服务器端口         | `8765`                                          |
| `HOST`     | 监听地址           | `0.0.0.0`                                       |

### 配置方式

**方式一：`.env` 文件（推荐）**

```bash
cp .env.example .env
# 编辑 .env
API_KEY=sk_xxxxx
```

**方式二：环境变量**

```bash
API_KEY=sk_xxxxx python3 server.py
```

**方式三：Docker Compose**

docker-compose.yml 会自动读取 `.env` 文件，也可以直接在 `environment` 中设置：

```yaml
environment:
  - API_KEY=sk_xxxxx
```

### 其他配置

| 配置项          | 位置               | 默认值                    |
|----------------|--------------------|---------------------------|
| Logo 选项       | assets/            | logo_1.png ~ logo_5.png   |
| 生成超时        | js/app.js          | 5 分钟                    |
| 默认尺寸        | index.html         | 1024x1024                 |
| 默认画质        | index.html         | high                      |
| 输出格式        | js/app.js          | png                       |

---

## API 调用方式

本项目提供两种 API 调用方式：**前端直接调用 PPIO API** 和 **OpenAI 兼容代理服务器**。

### 方式一：前端直接调用 PPIO API

前端通过 `server.py` 注入的配置，直接向 PPIO API 发起请求。

#### 文生图（Text-to-Image）

```bash
curl -X POST https://api.ppio.com/v3/gpt-image-2-text-to-image \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "高品质餐厅菜单摄影，红烧肉",
    "size": "1024x1536",
    "n": 1,
    "quality": "high",
    "moderation": "low",
    "output_format": "png",
    "output_compression": 100,
    "background": "opaque"
  }'
```

**响应示例：**

```json
{
  "code": 200,
  "images": ["https://cdn.ppio.com/xxx/result.png"]
}
```

#### 图生图 / Logo 生图（Image Edit）

```bash
curl -X POST https://api.ppio.com/v3/gpt-image-2-edit \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "高品质餐厅菜单摄影，红烧肉",
    "size": "1024x1536",
    "n": 1,
    "quality": "high",
    "moderation": "low",
    "output_format": "png",
    "output_compression": 100,
    "background": "opaque",
    "image": "data:image/png;base64,iVBORw0KGgo..."
  }'
```

#### Inpaint 修复（带 mask）

```bash
curl -X POST https://api.ppio.com/v3/gpt-image-2-edit \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "把背景换成蓝色",
    "size": "1024x1024",
    "n": 1,
    "quality": "high",
    "moderation": "low",
    "output_format": "png",
    "output_compression": 100,
    "background": "opaque",
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "mask": "data:image/png;base64,iVBORw0KGgo..."
  }'
```

> **mask 格式**：透明区域（alpha=0）为需要修复的部分，不透明区域（alpha=255）为保留区域。

#### 请求参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 是 | 生成描述文本 |
| `size` | string | 否 | 图片尺寸，默认 `1024x1024`，支持 `1024x1536`、`1536x1024`、`2048x2048` 等 |
| `n` | int | 否 | 生成数量，默认 `1` |
| `quality` | string | 否 | 画质：`medium` / `high`，默认 `high` |
| `moderation` | string | 否 | 内容审核级别：`low` / `medium` / `high` |
| `output_format` | string | 否 | 输出格式：`png` / `jpeg` / `webp` |
| `output_compression` | int | 否 | 压缩质量 0-100，默认 `100` |
| `background` | string | 否 | 背景：`opaque`（不透明）/ `transparent`（透明） |
| `image` | string | 否 | 参考图 data URL（图生图/Inpaint 时必填） |
| `mask` | string | 否 | 遮罩图 data URL（Inpaint 时使用） |

#### 支持的尺寸列表

```
1024x1024, 1024x1536, 1536x1024, 2048x2048, 2048x1152, 1152x2048,
2048x1536, 1536x2048, 2048x1360, 1360x2048, 2048x1024, 1024x2048,
2048x880, 880x2048, 2048x688, 688x2048, 3840x2160, 2160x3840, auto
```

---

### 方式二：OpenAI 兼容代理服务器

启动 `api_server.py` 后，可通过 OpenAI 标准格式调用（适用于 Open WebUI 等工具集成）。

```bash
python3 api_server.py
# 默认监听 http://0.0.0.0:8766
```

#### 列出可用模型

```bash
curl http://localhost:8766/v1/models
```

**响应：**

```json
{
  "object": "list",
  "data": [{"id": "gpt-image-2", "object": "model", "owned_by": "ppio"}]
}
```

#### 文生图（OpenAI 格式）

```bash
curl -X POST http://localhost:8766/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一份精美的提拉米苏",
    "model": "gpt-image-2",
    "n": 1,
    "size": "1024x1024",
    "quality": "hd",
    "response_format": "url"
  }'
```

**响应：**

```json
{
  "created": 1700000000,
  "data": [{"url": "https://cdn.ppio.com/xxx/result.png"}]
}
```

> `response_format` 设为 `b64_json` 可直接返回 base64 编码图片数据。

#### 图片编辑（OpenAI 格式，multipart/form-data）

```bash
curl -X POST http://localhost:8766/v1/images/edits \
  -F "image=@photo.png" \
  -F "mask=@mask.png" \
  -F "prompt=把背景换成海滩" \
  -F "size=1024x1024" \
  -F "quality=hd" \
  -F "response_format=url"
```

#### OpenAI 参数映射

| OpenAI 参数 | PPIO 映射 | 说明 |
|------------|-----------|------|
| `quality: "standard"` | `quality: "medium"` | 标准画质 |
| `quality: "hd"` | `quality: "high"` | 高清画质 |
| `quality: "auto"` | `quality: "high"` | 自动映射为高清 |
| `size: "256x256"` | `size: "1024x1024"` | 小尺寸自动升级 |
| `size: "512x512"` | `size: "1024x1024"` | 小尺寸自动升级 |
| `size: "1024x1792"` | `size: "1024x1536"` | 映射为最近尺寸 |
| `size: "1792x1024"` | `size: "1536x1024"` | 映射为最近尺寸 |

#### Open WebUI 集成配置

在 Open WebUI 中添加图片生成服务：

- **Base URL**: `http://<服务器IP>:8766/v1`
- **API Key**: 任意非空字符串
- **Model**: `gpt-image-2`

---

## 原理

### 生成流程

1. 用户输入菜品名 → 前端拼接固定画风 Prompt
2. `POST api.ppio.com` → 返回图片 URL
3. 前端展示图片 + 下载按钮

### 固定画风 Prompt

```
采用#F3B9D9、#FFEE3D、#00E57F这三个颜色构成背景与柔和自然棚拍光线，
高品质餐厅菜单摄影，简约无杂乱构图，主体居中，专业美食摄影，
```

### Logo 生图

以用户选择的 Logo PNG 为参考图，调用图生图 API，提示词追加「将该logo居中置顶，维持logo样式。」。

### 虚拟进度条

- 1% → 50%: 约 15 秒
- 50% → 75%: 约 20 秒
- 75% → 99%: 约 2 分钟
- 卡在 99% 直到 API 返回，瞬间跳到 100%
- 超时 5 分钟自动报错

### 下拉菜单底部「上传自定义Logo」选项
- 点击后弹出文件选择器，上传成功后预览图自动更新。
- 上传的 Logo 转为 base64 存储在内存中，与预设 Logo 一样的生成逻辑，支持 Canvas 合成到样品实拍图上。
> 注意：上传的 Logo 只在当前会话有效，刷新后需要重新上传。如果需要长期使用，可以把图片放到 assets/ 目录并更新 build_logo_data.py 重新生成
