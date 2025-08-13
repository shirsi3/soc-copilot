# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY vite.config.* ./
COPY tsconfig*.json ./
COPY . .
RUN npm ci || npm install
RUN npm run build

# --- Runtime stage (Nginx) ---
FROM nginx:alpine
# Copy build artefacts
COPY --from=builder /app/dist /usr/share/nginx/html
# Replace default nginx config for single-page app routing and caching
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
