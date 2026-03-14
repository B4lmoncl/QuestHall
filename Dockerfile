FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY . .
RUN npm run build
RUN mkdir -p /app/data

EXPOSE 3001
CMD ["node", "server.js"]
