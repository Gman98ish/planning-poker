FROM node

RUN mkdir /app
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm i
COPY . /app
RUN npx vite build
RUN cp -r /app/dist/** /app/public
ENV APP_ENV=production

ENTRYPOINT ["/usr/local/bin/node", "server.js"]
