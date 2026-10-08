# Minimal Dockerfile for the Node.js app
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . .

# Cloud Run sets PORT via env var; default to 8080 inside container
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/server.js"]
