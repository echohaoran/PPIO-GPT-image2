# API 调用指南

本项目的 `api_server.py` 提供 OpenAI 兼容的图片生成 API，**不注入任何固定提示词**，prompt 完全由调用方控制。

---

## 服务地址

- 默认端口：`8766`
- 示例地址：`http://<服务器IP>:8766`

---

## 使用自己的 API Key

支持通过 `Authorization` 请求头传入你自己的 PPIO API Key。服务器优先使用你传入的 Key，未传则使用服务器默认配置的 Key。

### 带自定义 Key 的调用示例

```bash
curl -X POST http://<服务器IP>:8766/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_your_own_key_here" \
  -d '{
    "prompt": "一只橘猫坐在窗台上看夕阳",
    "model": "gpt-image-2",
    "n": 1,
    "size": "1024x1024",
    "quality": "hd",
    "response_format": "url"
  }'
```

### 不带 Key（使用服务器默认 Key）

```bash
curl -X POST http://<服务器IP>:8766/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只橘猫坐在窗台上看夕阳",
    "model": "gpt-image-2",
    "n": 1,
    "size": "1024x1024",
    "quality": "hd",
    "response_format": "url"
  }'
```

### 直接调用 PPIO 原生 API（不经过本项目代理）

```bash
curl -X POST https://api.ppio.com/v3/gpt-image-2-text-to-image \
  -H "Authorization: Bearer sk_your_own_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "你的描述",
    "size": "1024x1024",
    "n": 1,
    "quality": "high",
    "moderation": "low",
    "output_format": "png",
    "output_compression": 100,
    "background": "opaque"
  }'
```

---

## 一键配置提示词

以下提示词可用于在 AI 助手（如 ChatGPT、Claude 等）中一键配置本 API 的图片生成能力：

```
你可以调用图片生成 API 来创建图片。

API 端点：POST http://<服务器IP>:8766/v1/images/generations
请求头：
  Content-Type: application/json
  Authorization: Bearer <你的PPIO_API_KEY>

请求体（JSON）：
{
  "prompt": "<图片描述>",
  "model": "gpt-image-2",
  "n": 1,
  "size": "<尺寸，如 1024x1024>",
  "quality": "hd",
  "response_format": "url"
}

响应格式：
{
  "created": 1700000000,
  "data": [{"url": "https://..."}]
}

支持的尺寸：1024x1024, 1024x1536, 1536x1024, 2048x2048, auto
quality 选项：standard（中等）/ hd（高清）
response_format 选项：url（返回链接）/ b64_json（返回base64）

注意：prompt 无任何限制，直接描述你想要的图片即可。
```

---

## 文生图（Text-to-Image）

```bash
curl -X POST http://<服务器IP>:8766/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_your_own_key_here" \
  -d '{
    "prompt": "一只橘猫坐在窗台上看夕阳",
    "model": "gpt-image-2",
    "n": 1,
    "size": "1024x1024",
    "quality": "hd",
    "response_format": "url"
  }'
```

### 响应示例

```json
{
  "created": 1700000000,
  "data": [
    {"url": "https://cdn.ppio.com/xxx/result.png"}
  ]
}
```

---

## 图片编辑（Image Edit）

```bash
curl -X POST http://<服务器IP>:8766/v1/images/edits \
  -H "Authorization: Bearer sk_your_own_key_here" \
  -F "image=@photo.png" \
  -F "prompt=将背景替换为星空" \
  -F "size=1024x1024" \
  -F "quality=hd" \
  -F "response_format=url"
```

---

## Inpaint 修复（带 mask）

```bash
curl -X POST http://<服务器IP>:8766/v1/images/edits \
  -H "Authorization: Bearer sk_your_own_key_here" \
  -F "image=@photo.png" \
  -F "mask=@mask.png" \
  -F "prompt=把背景换成海滩" \
  -F "size=1024x1024" \
  -F "quality=hd" \
  -F "response_format=url"
```

> **mask 格式**：透明区域（alpha=0）为需要修复的部分，不透明区域（alpha=255）为保留区域。

---

## 获取 base64 格式图片

将 `response_format` 设为 `b64_json`：

```bash
curl -X POST http://<服务器IP>:8766/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_your_own_key_here" \
  -d '{
    "prompt": "一份精美的提拉米苏",
    "model": "gpt-image-2",
    "n": 1,
    "size": "1024x1536",
    "quality": "hd",
    "response_format": "b64_json"
  }'
```

响应：

```json
{
  "created": 1700000000,
  "data": [
    {"b64_json": "/9j/4AAQ..."}
  ]
}
```

---

## 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `prompt` | string | 图片描述，无任何限制，完全自由 |
| `model` | string | 固定为 `gpt-image-2` |
| `n` | int | 生成数量，默认 1 |
| `size` | string | 图片尺寸（见下方支持列表） |
| `quality` | string | `standard`(中等画质) / `hd`(高清画质) |
| `response_format` | string | `url`(返回图片链接) / `b64_json`(返回base64数据) |
| `Authorization` | header | `Bearer <你的API_KEY>`，可选，不传则用服务器默认Key |

### 支持的尺寸

```
1024x1024, 1024x1536, 1536x1024, 2048x2048, 2048x1152, 1152x2048,
2048x1536, 1536x2048, 2048x1360, 1360x2048, 2048x1024, 1024x2048,
2048x880, 880x2048, 2048x688, 688x2048, 3840x2160, 2160x3840
```

> OpenAI 格式的小尺寸（256x256, 512x512）会自动升级为 1024x1024。

---

## Open WebUI 集成

在 Open WebUI 中添加图片生成服务：

| 配置项 | 值 |
|--------|------|
| Base URL | `http://<服务器IP>:8766/v1` |
| API Key | 你自己的 PPIO API Key（或任意非空字符串使用服务器默认Key） |
| Model | `gpt-image-2` |

---

## 与前端 WebUI 的区别

| | API 调用 | 前端 WebUI |
|---|---|---|
| 固定提示词 | **无**，prompt 完全自由 | 自动拼接画风提示词 |
| API Key | 支持用户自带 Key | 使用服务器配置的 Key |
| 使用方式 | curl / 代码 / Open WebUI | 浏览器访问 :8765 |
| 适合场景 | 自定义集成、批量生成 | 快速菜品图生成 |
