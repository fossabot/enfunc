FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn
COPY . .
EXPOSE 3000
RUN mkdir -p /usr/src/app/apps
VOLUME /usr/src/app/apps
CMD [ "yarn", "start" ]