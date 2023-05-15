# ---- Base Node ----
FROM alpine:3.18.0 AS base
# install node
RUN apk add --no-cache nodejs-current npm tini git
# set working directory
WORKDIR /app
# Set tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]
# copy project file
COPY package.json .

#
# ---- Dependencies ----
FROM base AS dependencies
# install node packages
RUN npm set progress=false && npm config set depth 0
RUN npm install --only=production 
# copy production node_modules aside
RUN cp -R node_modules prod_node_modules
# install ALL node_modules, including 'devDependencies'
RUN npm install

#
# ---- Test ----
FROM dependencies AS test
COPY src ./src
COPY tsconfig.json squirrelly.js jest.config.cjs .eslintrc.json .env.test .
RUN npm run lint
# RUN npm run test

#
# ---- Build ----
FROM dependencies AS build
COPY src ./src
COPY tsconfig.json squirrelly.js jest.config.cjs .eslintrc.json .env.test .
RUN npm run build

#
# ---- Release ----
FROM base AS release
# copy production node_modules
COPY --from=dependencies /app/prod_node_modules ./node_modules
# copy app dist
COPY --from=build /app/dist ./dist
# copy app extras
COPY tsconfig.json squirrelly.js /app/
COPY patches /app/patches
COPY locales /app/locales
COPY assets /app/assets
# expose port and define CMD
EXPOSE 3000
CMD node dist/index.js