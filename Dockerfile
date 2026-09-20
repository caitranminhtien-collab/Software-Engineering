# Phiên bản Node nên trùng với bản dùng ở máy và trong CI.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
# Đường dẫn /api/v1/health giả định main.ts đặt global prefix 'api/v1'
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main"]
