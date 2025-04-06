FROM node:18-alpine AS builder

WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3031

# 复制构建产物和依赖
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 暴露默认端口
EXPOSE ${PORT}

# 设置健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "process.exit(require('net').createConnection(process.env.PORT || 3031).on('error', () => 1).on('connect', () => 0))"

# 运行应用
CMD ["node", "dist/index.js"] 