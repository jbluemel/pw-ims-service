# --- Build stage: install all deps and compile TS ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage: production deps + compiled output only ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Run as the built-in non-root user.
USER node

EXPOSE 3001

# Exec form + direct node (not `npm start`) so the process is PID 1 and
# receives SIGTERM directly — required for our graceful shutdown to fire.
CMD ["node", "dist/index.js"]
