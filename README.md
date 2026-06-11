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
├── server.py               # Python 静态文件服务器
├── Dockerfile              # Docker 镜像配置
├── docker-compose.yml      # Docker Compose 部署
├── nginx.conf              # Nginx 配置（可选）
└── deploy.sh               # 部署脚本
```

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

### 方式二：自定义端口

```bash
PORT=80 docker-compose up -d
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

### 1. Logo 生图（默认页面）

选择一个 Logo 样式（下拉菜单），输入菜品名称，点击「生成」。系统会自动将 Logo 合成到生成的菜品图中。

- 固定画风：柔和棚拍光线 + 粉黄绿三色背景 + 主体居中
- 提示词自动追加：「将该logo居中置顶，维持logo样式。」

### 2. 文生图

输入菜品名称，选择尺寸和画质，点击「生成」。无需上传任何图片。

### 3. 图生图

上传一张参考图，输入菜品名称，点击「生成」。系统会基于参考图风格重新生成。

### 4. 修复（Inpaint）

上传原图，在画布上用画笔涂抹需要修改的区域（红色标记），输入修复提示词，点击「生成」。

### 5. 下载图片

鼠标悬停在生成的图片上，右上角会出现下载按钮，点击即可下载。

### 6. 历史记录

右侧面板显示历史生成记录，点击可回看，支持单条删除和全部清空。

### 7. 语言切换

右上角下拉菜单可切换中文 / 英文，选择会保存在浏览器中。

---

## 配置说明

| 配置项          | 位置               | 默认值                                      |
|----------------|--------------------|---------------------------------------------|
| API Key        | js/app.js          | sk_aODZCHX9...                              |
| T2I Endpoint   | js/app.js          | api.ppio.com/v3/gpt-image-2-text-to-image   |
| Edit Endpoint  | js/app.js          | api.ppio.com/v3/gpt-image-2-edit            |
| Logo 选项       | assets/            | logo_1.png ~ logo_5.png                     |
| 服务器端口      | 环境变量 PORT      | 8765                                        |
| 生成超时        | js/app.js          | 5 分钟                                      |
| 默认尺寸        | index.html         | 1024x1024                                   |
| 默认画质        | index.html         | high                                        |
| 输出格式        | js/app.js          | png                                         |

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
