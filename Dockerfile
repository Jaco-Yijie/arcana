# Arcana —— 用于 Hugging Face Spaces（Docker SDK）
#
# 两阶段构建：
#   build   装全量依赖并产出 dist/（vite / tsc / tailwind 都在 devDependencies 里，
#           所以这一阶段不能用 --omit=dev）
#   runtime 只装运行时依赖，体积小很多
#
# 运行时之所以还需要 src/：服务端会**值导入** src/data/deck 与 src/features/reading/*
# 来重建可信的牌义上下文（客户端一个字的牌义都不传，见 docs/v2/11-architecture.md F-3）。
# 类型导入会被 tsx 擦除，但这几个是真实代码，必须在镜像里。

# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:22-slim AS runtime

# Hugging Face Spaces 要求容器以 UID 1000 运行，否则没有写权限
RUN useradd -m -u 1000 user

WORKDIR /app
ENV NODE_ENV=production
# HF Spaces 默认把流量打到 7860，与 README.md 里的 app_port 保持一致
ENV PORT=7860

COPY --chown=user:user package.json package-lock.json ./
# tsx 在 dependencies 里，所以 --omit=dev 之后服务仍然起得来
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build --chown=user:user /app/dist ./dist
COPY --from=build --chown=user:user /app/server ./server
COPY --from=build --chown=user:user /app/src ./src
COPY --from=build --chown=user:user /app/tsconfig.json ./
COPY --from=build --chown=user:user /app/tsconfig.app.json ./
COPY --from=build --chown=user:user /app/tsconfig.server.json ./

USER user
EXPOSE 7860

# DEEPSEEK_API_KEY 由 HF Space 的 Secrets 注入，绝不写进镜像
CMD ["npm", "start"]
