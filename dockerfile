FROM node:22 AS builder
WORKDIR /src

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build



FROM node:22-alpine
WORKDIR /usr/code/

# Update packages and install bash and gcc
RUN apk update && \
apk upgrade && \
apk add bash gcc curl

# download dumb-init 
RUN wget -O /usr/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64 && \
chmod +x /usr/bin/dumb-init

COPY --from=builder /src/dist/  /usr/code/
COPY --from=builder /src/node_modules/  /usr/code/node_modules/
COPY --from=builder /src/config/  /usr/code/config/

ENV PORT='80'
ENV SERVER_JS='server.js'

# Expose port
EXPOSE ${PORT}

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bash", "-c", "node ${SERVER_JS}"]
