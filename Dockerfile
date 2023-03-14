FROM node:18-alpine as builder

WORKDIR /app

# Install required packages
COPY package*.json /app/
RUN npm install

# Copy source files
COPY src /app/src
COPY tsconfig.json squirrelly.js /app/
COPY patches /app/patches
COPY prisma /app/prisma

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# ==== Final Image
FROM node:18-alpine as final
USER node:node
WORKDIR /app

# Copying build output
COPY --from=builder --chown=node:node /app/squirrelly.js ./
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/prisma prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder --chown=node:node /app/dist dist

# Copy assets
COPY --chown=node:node assets /app/assets

# Install only the production dependencies
RUN npm install --production

CMD npm start