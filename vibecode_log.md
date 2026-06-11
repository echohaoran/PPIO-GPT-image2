# VibeCode 开发日志

> 记录每次代码变更、完成进度和决策依据。

---

## 2026-06-11

### 初始构建 — 单文件 HTML 应用

- **创建** `index.html`，零依赖 SPA，内嵌 CSS + JS
- **功能**: 文生图 (T2I)、图生图 (I2I)、Inpaint 三个生成模式
- **API**: PPIO GPT Image 2 (`api.ppio.com`)，Bearer Token 认证
- **特性**: 暗色主题、虚拟进度条、历史记录 (localStorage)、日志收集

### 迭代 1 — 尺寸自定义

- 每个 Tab 尺寸选择区增加「自定义」按钮 + 宽高输入框
- `getSize()` 支持读取自定义输入值 (256~4096px)
- Grid 布局从 3 列改为 4 列

### 迭代 2 — 下载按钮

- 生成图片右上角增加 ⬇ 下载按钮 (hover 显示)
- 通过 `fetch → blob → createObjectURL` 强制下载，解决跨域 `download` 属性失效

### 迭代 3 — 固定画风提示词

- 固定画风 prompt: `采用#F3B9D9、#FFEE3D、#00E57F这三个颜色构成背景与柔和自然棚拍光线，高品质餐厅菜单摄影，简约无杂乱构图，主体居中，专业美食摄影，`
- 三个颜色用圆点可视化展示
- 输入框 placeholder 改为「目标菜品」
- Inpaint 改名为「修复」

### 迭代 4 — Logo 叠加 (多次尝试)

- **尝试 1**: 提示词中写 `~/logo.png` → 生成文字而非图片 ❌
- **尝试 2**: Canvas 叠加，`<img>` 预加载 logo → `file://` 下 `crossOrigin` 导致失败 ❌
- **尝试 3**: `fetch('logo.png')` → data URL → `file://` 下 fetch 被禁 ❌
- **尝试 4**: 隐藏 `<img>` 标签预加载 + `drawImage(imgEl)` → Canvas 跨域污染 ❌
- **最终方案**: Python 服务器 `POST /composite-logo`，Pillow 合成 → ✅

### 迭代 5 — 项目架构变更

- 引入 `server.py` (Python HTTP 服务器)
  - 静态文件服务
  - `/composite-logo` Logo 合成接口 (Pillow)
  - 合成结果保存到 `output/` 目录
- 增加 ☑️「叠加 Logo」勾选框（默认勾选）
  - 勾选: API 返回 → 调用 `/composite-logo` → 展示合成图
  - 未勾选: API 返回 → 直接预览原图

### 迭代 6 — UI 调整

- 标题改为「成长中心菜品图生成」，header 用 logo 图片替代文字
- 底色改为白色 (CSS 变量全部调整为白底深字)
- 默认尺寸改为 1024x1024
- 输出格式改为 PNG
- 生成最长 5 分钟超时 (AbortController)
- 进度条 75%-99% 改为 2 分钟
- 实时日志面板 (进度条下方)

### 迭代 7 — 文件拆分重构

- `index.html` → 纯 HTML 骨架 (结构)
- `css/style.css` → 全部样式 (表现)
- `js/app.js` → 全部逻辑 (行为)
- `assets/` → logo.png, all-logo.svg (资源)
- `server.py` → LOGO_PATH 更新为 `assets/logo.png`
- 所有路径均为相对路径，验证通过

### 迭代 8 — i18n 国际化支持 (进行中)

- 新增 `js/i18n.js` + `js/locales/zh-CN.json` + `js/locales/en-US.json`
- HTML 中可翻译文本使用 `data-i18n` 属性标记
- 语言切换 UI (header 下拉)
- 当前支持: 中文 (zh-CN)、英文 (en-US)

### 迭代 9 — Logo 合成方案变更

- **移除** server.py 中的 Pillow Logo 合成功能（网络下载不稳定）
- **移除** 前端 Logo 勾选框和 compositeLogoServer 逻辑
- **移除** server.py 依赖 Pillow，简化为纯静态文件服务器
- **新增** 「Logo生图」Tab：调用图生图 API，以 logo.png 为固定参考图
  - 启动时自动 fetch `assets/logo.png` → base64 data URL
  - 提示词自动追加「将该logo居中置顶。」
  - 调用 EDIT_URL（图生图接口），无需手动上传
- 4 个 Tab: 文生图 | 图生图 | 修复 | Logo生图

### 迭代 10 — i18n 修复

- locale 文件从 `.js` 改为 `.json`，`i18n.js` 使用 `fetch().json()` 加载
- 移除 style_preset 上的 `data-i18n`（含嵌套 HTML 会被 textContent 破坏）
- Logo生图 Tab 的状态消息统一使用 `I18N.t()`
- 所有硬编码中文已替换为 i18n key

### 迭代 12 — Logo 选择修复

- 修复 Logo 切换预览不生效问题：改用 `img.src` 直接赋值（兼容 file:// 协议）
- Logo base64 转换延迟到生成时才执行（减少内存占用）
- 清理旧的 `assets/logos/` 目录和 `logo.png`

### 迭代 13 — 服务器配置与部署

- `server.py` 升级为生产级：环境变量配置、CORS、缓存头、信号处理
- 新增 `Dockerfile`：基于 python:3.9-slim，一键构建镜像
- 新增 `docker-compose.yml`：容器化部署，支持自定义端口
- 新增 `nginx.conf`：Nginx 静态文件服务配置（gzip、缓存策略）
- 新增 `deploy.sh`：统一部署脚本（local/docker/nginx/stop/build）

### 迭代 14 — Logo生图增加样品实拍

- 新增「样品实拍」上传按钮，上传后显示预览图
- 生成时：有样品图 → Canvas 合成 Logo 到样品图上 → 发送 API
- 生成时：无样品图 → 仅发送 Logo 作为参考图（原有逻辑）
- 云服务器部署完成：45.40.243.178:8765

### 迭代 15 — 固定画风提示词可编辑

- 4 个面板的固定画风提示词从 div 改为 textarea，用户可直接编辑
- 编辑后自动保存到 localStorage，下次打开自动加载
- 每个面板独立保存各自的画风提示词
- Logo生图面板默认包含 logo 相关提示词，其他面板共享基础提示词
