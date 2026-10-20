FROM node:22-alpine AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制package.json和package-lock.json
COPY package.json package-lock.json ./

# Coolify 会向每个 stage 注入 ARG NODE_ENV=production。
# 该变量会让 npm ci 跳过 devDependencies，构建期缺少 Tailwind / TypeScript。
RUN NODE_ENV=development npm ci --include=dev

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 客户端环境变量需在构建时注入
ARG NEXT_PUBLIC_USE_STREAMING
ENV NEXT_PUBLIC_USE_STREAMING=${NEXT_PUBLIC_USE_STREAMING}

# 构建应用
RUN npm run build

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 设置环境变量
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

# 暴露端口
EXPOSE ${PORT}

# 启动应用
CMD ["node", "server.js"] 