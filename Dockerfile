FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Reuse the build stage's full node_modules: the CMD applies the .ts migrations
# at boot via node-pg-migrate (-j ts), which needs the node-pg-migrate bin, ts-node
# and typescript — all of which live in the build stage's node_modules.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY tsconfig.json ./
EXPOSE 3002
# node-pg-migrate connects via DATABASE_URL; build it from the same DB_* vars the app reads.
CMD ["sh", "-c", "export DATABASE_URL=\"postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}\" && npm run migrate:up && node dist/src/index.js"]
