
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production --silent
COPY server.js .
COPY client/dist ./client/dist
EXPOSE 3000
CMD ["node", "server.js"]
