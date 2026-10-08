# Minimal Dockerfile for the Node.js app
# Uses node 18 LTS
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copy package.json and package-lock.json if present
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . .

# Use PORT from environment (Cloud Run sets PORT)
ENV PORT 8080
ENV NODE_ENV production

# Expose port (informational)
EXPOSE 8080

# Start the server
CMD ["node", "src/server.js"]
