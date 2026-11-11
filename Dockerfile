# Dockerfile para la aplicación Node.js
FROM node:20-alpine

WORKDIR /usr/src/app

# Instala dependencias de producción usando el lockfile
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el código de la aplicación
COPY . .

# Cloud Run inyecta PORT; el valor por defecto dentro del contenedor es 8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/server.js"]
