# Build stage
FROM node:20-bullseye AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Runtime stage
FROM node:20-bullseye
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start", "--", "-p", "3000"]
