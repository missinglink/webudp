FROM node:22-alpine

RUN mkdir -p /work && chown -R node:node /work
WORKDIR /work

USER node
RUN npm i ws --production

COPY --chown=node:node package.json package.json
COPY --chown=node:node src/server.js server.js
COPY --chown=node:node src/protocol.js protocol.js
COPY --chown=node:node dist/bundle.js bundle.js

# https://fly.io/docs/networking/udp-and-tcp/
# ENV UDP_HOST="fly-global-services"

CMD [ "node", "--experimental-websocket", "server.js" ]