# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# esbuild needs this on Alpine
RUN apk add --no-cache libc6-compat

# Install deps first
COPY package*.json ./
RUN npm ci || npm install

# Copy Vite config & source
COPY vite.config.* ./
COPY tsconfig*.json ./
COPY .env* ./
COPY index.html ./
COPY src ./src

#  Generate shadcn components inside the image (idempotent)
RUN npx --yes shadcn@latest init -y && \
    npx --yes shadcn@latest add button card badge input select dropdown-menu avatar

# Build
RUN npm run build

# --- Runtime stage (Nginx) ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
