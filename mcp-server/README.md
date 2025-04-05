# AiryLark MCP 翻译服务器

[![License: Custom](https://img.shields.io/badge/License-Custom%20(Apache%202.0%20with%20restrictions)-blue.svg)](../LICENSE)

这是AiryLark项目的ModelContextProtocol(MCP)服务器模块，提供高精度的翻译服务接口。MCP是一种标准协议，允许智能助手与外部服务进行结构化交互。

## 功能特点

- **三阶段翻译流程**：分析规划、分段翻译、全文审校，保证翻译质量
- **多语言支持**：支持中文、英文、日语、韩语等多种语言间的互译
- **专业术语识别**：自动识别各领域专业术语并提供准确翻译
- **MCP标准接口**：遵循ModelContextProtocol规范，易于与Claude等大型模型集成
- **OpenAI兼容API**：可与任何兼容OpenAI API的大模型一起使用

## 安装

1. 确保已安装Node.js (v18+)和npm

2. 安装依赖:

```bash
cd mcp-server
npm install
```

3. 配置环境变量:

创建`.env`文件或设置以下环境变量:

```
# 翻译API配置
TRANSLATION_API_KEY=your_api_key
TRANSLATION_MODEL=your_model_name
TRANSLATION_BASE_URL=your_api_base_url

# 服务器配置
PORT=3041  # MCP服务器端口，可选，默认3041
```

## 使用方法

### 开发环境

启动开发服务器:

```bash
npm run dev
```

### 生产环境

构建并启动服务器:

```bash
npm run build
npm start
```

## 接口说明

服务器提供以下MCP标准接口:

### 工具接口

- **translate_text**: 翻译文本工具
  - 参数:
    - `text`: 需要翻译的文本
    - `target_language`: 目标语言代码
    - `source_language`: (可选)源语言代码
    - `high_quality`: (可选)是否启用高精度翻译流程，默认为true

### 资源接口

- **supported_languages**: 支持的语言列表
  - URI: `languages://list`

## 与Claude集成

示例使用Claude/Anthropic Assistant与MCP服务器交互:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// 连接到MCP服务器
const transport = new SSEClientTransport("http://localhost:3041");
const client = new Client(
  { name: "claude-client", version: "1.0.0" },
  { capabilities: { tools: {} } }
);
await client.connect(transport);

// 调用翻译工具
const result = await client.callTool({
  name: "translate_text",
  arguments: {
    text: "Hello, world!",
    target_language: "zh",
    high_quality: true
  }
});

console.log(result.content[0].text); // 输出: "你好，世界！"
```

## Docker部署

构建Docker镜像:

```bash
docker build -t airylark-mcp-server .
```

运行容器:

```bash
docker run -p 3041:3041 --env-file .env -d airylark-mcp-server
```

## 许可证

本项目使用与AiryLark主项目相同的定制许可证，详见[LICENSE](../LICENSE)文件。 