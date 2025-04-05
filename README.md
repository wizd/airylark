# AiryLark

[![License: Custom](https://img.shields.io/badge/License-Custom%20(Apache%202.0%20with%20restrictions)-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/airylark)](https://github.com/yourusername/airylark/issues)

> 一个多功能文档处理与翻译工具，基于Next.js构建

AiryLark是一个开源的文档处理工具，支持多种文件格式的输入和处理。无论是PDF文档、Word文件还是纯文本，AiryLark都能高效处理。

## 在线试用

您可以通过访问 [https://airylark.vcorp.ai/](https://airylark.vcorp.ai/) 来试用AiryLark的在线版本，体验多语言翻译服务的高精度和高效率。

## 核心功能

### 多格式支持

#### 文件类型

- PDF 文档 (.pdf)
- Word 文档 (.doc, .docx)
- 文本文件 (.txt)
- Markdown 文件 (.md)

#### 文本输入

- 直接粘贴文本内容
- 网页链接 (http/https URL)
- 拖放文件上传

### 高级翻译引擎

- **智能规划**：系统会对文档进行分析，识别文档类型、风格和专业领域，制定翻译策略
- **上下文感知**：考虑全文语境进行翻译，保持风格一致性
- **专业术语识别**：自动识别和正确翻译各领域专业术语
- **键值术语表**：显示原文和译文中的关键术语对照，方便参考

### 质量评估与优化

- **自动校对**：翻译完成后进行全文校对，检查一致性
- **翻译质量评估**：提供专业的翻译质量评分和改进建议
- **详细修改意见**：指出具体问题位置，并给出修改建议
- **多维度评价**：从准确性、流畅度、术语一致性等多个维度进行评估

### 专家工具

- **专家编辑模式**：对自动翻译结果进行专业校对和编辑
- **思考过程可视化**：显示AI翻译时的思考过程，提高翻译透明度
- **分段翻译展示**：逐段对比原文和译文，便于细致校对

## 与竞品对比

| 功能特性 | AiryLark | DeepL | Google翻译 | 百度翻译 |
|---------|---------|-------|-----------|---------|
| 开源免费 | ✅ | ❌ | ❌ | ❌ |
| 自托管部署 | ✅ | ❌ | ❌ | ❌ |
| 文件格式支持 | PDF, Word, TXT, MD | Word, PDF, PPT | Doc, PDF | Doc, PDF |
| 翻译思考过程 | ✅ | ❌ | ❌ | ❌ |
| 专业术语优化 | ✅ | ✅ | 部分支持 | 部分支持 |
| 质量评估系统 | ✅ | ❌ | ❌ | ❌ |
| 专家编辑模式 | ✅ | 部分支持 | ❌ | ❌ |
| 上下文感知翻译 | ✅ | ✅ | 部分支持 | 部分支持 |
| 离线使用 | ✅ | ❌ | ❌ | ❌ |
| API集成 | ✅ | ✅ | ✅ | ✅ |

## 技术特点

- **流式处理**：使用流式API，实时展示翻译过程
- **模块化设计**：翻译过程分为规划、翻译、审阅三个清晰的步骤
- **高性能处理**：优化的文件处理逻辑，支持处理大型文档
- **自定义模型**：支持通过环境变量配置自定义翻译模型

## 开发指南

首先，运行开发服务器：

```bash
# 同时启动Next.js应用和MCP服务器
npm run dev:mcp

# 或仅启动Next.js应用
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

### MCP服务器

AiryLark包含了一个ModelContextProtocol(MCP)服务器组件，用于提供高质量的翻译服务。MCP服务器可以：

- 通过标准协议与大型模型(如Claude)集成
- 提供结构化的翻译API
- 执行三阶段翻译流程，提高翻译质量

MCP服务器默认运行在端口3041，可以通过以下方式单独操作：

```bash
# 构建MCP服务器
npm run build:mcp

# 启动MCP服务器
npm run start:mcp:server
```

通过环境变量`USE_MCP=true`可以控制应用是否使用MCP服务器进行翻译。

## 部署指南

### 环境变量配置

在部署前，请确保配置以下环境变量：

```
TRANSLATION_API_KEY=your_api_key
TRANSLATION_MODEL=your_model
TRANSLATION_BASE_URL=your_base_url
```

### 方法一：传统部署

1. 构建应用：

```bash
npm run build
```

2. 启动生产服务器：

```bash
npm start
```

### 方法二：使用 Docker 部署

#### 快速部署（使用公共Docker镜像）

我们已经在Docker Hub上提供了预构建的镜像，您可以直接使用它进行快速部署：

1. 拉取最新的镜像：

```bash
docker pull docker.io/wizdy/airylark:latest
```

> **镜像标签说明**：
> - `latest`: 最新稳定版
> - `dev`: 开发版本，包含最新功能但可能不稳定
> - `v1.x.x`: 特定版本号，如需使用固定版本可指定，例如 `docker.io/wizdy/airylark:v1.0.0`

2. 创建环境变量文件（如`.env`）：

```
TRANSLATION_API_KEY=your_api_key
TRANSLATION_MODEL=your_model
TRANSLATION_BASE_URL=your_base_url
```

3. 运行容器：

```bash
docker run -p 3000:3000 --env-file .env -d docker.io/wizdy/airylark:latest
```

4. 访问应用：

在浏览器中打开 http://localhost:3000 即可使用AiryLark。

一键启动（适用于测试，无需配置环境变量文件）：

```bash
docker run -p 3000:3000 -e TRANSLATION_API_KEY=your_api_key -e TRANSLATION_MODEL=your_model -e TRANSLATION_BASE_URL=your_base_url -d docker.io/wizdy/airylark:latest
```

常见问题：
- 如果遇到权限问题，请尝试使用`sudo`运行Docker命令
- 端口冲突时，可以修改映射端口，例如：`-p 8080:3000`会将应用映射到8080端口

#### 单独使用 Dockerfile

1. 构建 Docker 镜像：

```bash
docker build -t airylark .
```

2. 运行容器：

```bash
docker run -p 3000:3000 --env-file .env.local -d airylark
```

#### 使用 Docker Compose

1. 创建 `.env` 文件（或使用现有的 `.env.local`）：

```
TRANSLATION_API_KEY=your_api_key
TRANSLATION_MODEL=your_model
TRANSLATION_BASE_URL=your_base_url
```

2. 创建 `docker-compose.yml` 文件：

```yaml
version: '3'
services:
  airylark:
    image: docker.io/wizdy/airylark:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
```

3. 启动服务：

```bash
docker-compose up -d
```

4. 停止服务：

```bash
docker-compose down
```

### 方法三：部署到 Vercel

最简单的部署 Next.js 应用的方式是使用 Vercel 平台。

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

## 许可证

本项目使用定制的AiryLark许可证，基于Apache 2.0开源许可证，并附加特定功能的商业保护条款：

- **核心代码**：采用Apache 2.0许可证开源
- **高级功能**：包括高级翻译功能、批量处理、API集成和企业级功能，具有附加使用条款
- **自托管免费**：所有功能在自托管版本中永久免费使用
- **商业保护**：第三方不得未经许可将特定功能作为服务销售

详细条款请参阅[LICENSE](LICENSE)文件。
