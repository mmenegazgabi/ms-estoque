FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
# node-pg-migrate + ts are needed at runtime to apply migrations
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY tsconfig.json ./
COPY --from=build /app/node_modules/node-pg-migrate ./node_modules/node-pg-migrate
EXPOSE 3002
CMD ["sh", "-c", "npm run migrate:up && node dist/src/index.js"]
