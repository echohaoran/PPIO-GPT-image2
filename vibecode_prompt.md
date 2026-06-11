# VibeCode Prompt — 项目架构与 Agent 规则

> 本文档是 Agent 操作本项目的权威参考。每次架构变更或规则调整必须增量更新。

---

## 1. 项目架构

```
PPIO-GPT-image2/
├── index.html              # HTML 骨架（纯结构，零内联样式/脚本）
├── css/
│   └── style.css           # 全局样式（CSS 变量驱动主题）
├── js/
│   ├── app.js              # 主逻辑（API、UI 交互、生成流程）
│   └── i18n.js             # 国际化引擎
│   └── locales/
│       ├── zh-CN.json      # 中文翻译
│       └── en-US.json      # 英文翻译
├── assets/
│   ├── logo.png            # Logo 图片（合成到生成图片顶部居中）
│   └── all-logo.svg        # 备用 Logo SVG
├── server.py               # Python 本地服务器（静态文件 + Logo 合成）
├── output/                  # 合成图片输出目录（运行时自动创建）
├── vibecode_log.md         # 开发日志
├── vibecode_prompt.md      # 本文件：架构 + Agent 规则
└── README.md               # 项目说明
```

## 2. 技术栈

| 层       | 技术                                  | 说明                        |
|----------|---------------------------------------|-----------------------------|
| 前端     | 原生 HTML + CSS + JS                  | 零框架、零构建、零依赖      |
| 后端     | Python 3 + http.server                 | 纯静态文件服务              |
| API      | PPIO GPT Image 2                      | 文生图 + 图片编辑           |
| 存储     | localStorage                          | 历史记录 + 日志             |
| i18n     | 自研轻量引擎 (data-i18n 属性)         | 中文 / 英文                 |

## 3. 核心数据流

```
用户输入菜品名 → 拼接固定画风 Prompt → POST api.ppio.com → 返回图片 URL
                                                              │
                         ┌────────────────────────────────────┤
                         │                                    │
                    文生图/图生图                         Logo生图
                    (prompt=固定画风+菜品名)          (prompt=固定画风+菜品名+logo居中置顶)
                         │                           (image=logo.png base64)
                         │                                    │
                    直接预览 URL                           直接预览 URL
                    下载原图                               下载原图
```

## 4. API 细节

### 4.1 文生图
- **Endpoint**: `POST https://api.ppio.com/v3/gpt-image-2-text-to-image`
- **Body**: `{ prompt, size, n, quality, moderation, output_format, output_compression, background }`
- **Auth**: `Authorization: Bearer sk_aODZCHX9jhJGPuDmlk-cEkQHO71CWc5JDMfmk_n2450`

### 4.2 图生图 / Inpaint / Logo生图
- **Endpoint**: `POST https://api.ppio.com/v3/gpt-image-2-edit`
- **Body**: 同上 + `image` (base64 data URL) + `mask` (base64 PNG, 透明=编辑区)
- **Logo生图**: `image` = `assets/logo.png` 的 base64，prompt 追加「将该logo居中置顶。」

## 5. Agent 规则

### 5.1 编码规范
- 所有路径使用**相对路径**（`css/style.css`, `assets/logo.png`）
- CSS 使用变量 (`--bg`, `--accent` 等)，禁止硬编码颜色值
- JS 中 DOM 引用统一用 `document.getElementById`
- 禁止 `as any`、`@ts-ignore`、空 catch 块
- 提示词固定前缀在 `STYLE_PROMPT` 常量中维护

### 5.2 文件变更规则
- CSS 变更 → 仅编辑 `css/style.css`
- JS 变更 → 仅编辑 `js/app.js` 或 `js/i18n.js`
- HTML 结构变更 → 仅编辑 `index.html`
- 新增翻译 → 编辑 `js/locales/zh-CN.js` 和 `en-US.js`
- 每次变更后更新 `vibecode_log.md`

### 5.3 禁止事项
- 禁止在 HTML 中内联 `<style>` 或 `<script>`
- 禁止使用绝对路径
- 禁止引入 npm 依赖
- 禁止修改 `server.py` 的端口号（默认 8765）除非用户明确要求

### 5.4 测试验证
- 每次变更后启动 `python3 server.py`，访问 `http://localhost:8765`
- 验证三个 Tab 切换正常
- 验证文生图/图生图/修复流程
- 验证 Logo 勾选/取消勾选行为
- 验证 i18n 语言切换

## 6. 变更历史

| 日期       | 变更内容                                       | 影响文件                              |
|------------|-----------------------------------------------|---------------------------------------|
| 2026-06-11 | 初始单文件构建                                 | index.html                            |
| 2026-06-11 | 尺寸自定义、下载按钮、固定画风、Logo 尝试      | index.html                            |
| 2026-06-11 | 引入 server.py + Logo 合成                     | index.html, server.py                 |
| 2026-06-11 | UI 白底化、超时、实时日志                       | index.html                            |
| 2026-06-11 | 文件拆分重构                                   | index.html, css/style.css, js/app.js  |
| 2026-06-11 | i18n 国际化支持                                | js/i18n.js, locales/*, index.html     |
| 2026-06-11 | 移除 Logo 合成，新增 Logo生图 Tab，简化 server | server.py, js/app.js, index.html      |
| 2026-06-11 | i18n 修复: JSON locale + fetch.json()          | js/i18n.js, locales/*.json            |
