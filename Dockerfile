FROM node

RUN mkdir /app
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm i
COPY . /app
RUN npx vite build --outDir public
ENV APP_ENV=production

ENTRYPOINT ["/bin/node", "server.js"]