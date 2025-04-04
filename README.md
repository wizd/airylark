# AiryLark

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 支持的输入类型

### 文件类型

- PDF 文档 (.pdf)
- Word 文档 (.doc, .docx)
- 文本文件 (.txt)
- Markdown 文件 (.md)

### 文本输入

- 直接粘贴文本内容
- 网页链接 (http/https URL)

## 开发指南

首先，运行开发服务器：

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

您可以通过修改 `app/page.tsx` 来开始编辑页面。当您编辑文件时，页面会自动更新。

本项目使用 [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) 自动优化并加载 [Geist](https://vercel.com/font)，这是 Vercel 的一个新字体系列。

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

2. 启动服务：

```bash
docker-compose up -d
```

3. 停止服务：

```bash
docker-compose down
```

### 方法三：部署到 Vercel

最简单的部署 Next.js 应用的方式是使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)。

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

查看 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying) 了解更多详情。

## 了解更多

要了解有关 Next.js 的更多信息，请查看以下资源：

- [Next.js 文档](https://nextjs.org/docs) - 了解 Next.js 功能和 API。
- [学习 Next.js](https://nextjs.org/learn) - 一个交互式 Next.js 教程。

您可以查看 [Next.js GitHub 仓库](https://github.com/vercel/next.js) - 欢迎您的反馈和贡献！

## 许可证

本项目使用 [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](LICENSE) 进行许可。

该许可证允许他人自由地分享和改编本项目，但必须保留原作者署名，且不得用于商业目的。详细条款请参阅[LICENSE](LICENSE)文件。
