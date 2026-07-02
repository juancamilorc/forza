FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build api --skip-nx-cache
EXPOSE 3000
CMD ["node", "dist/apps/api/main.js"]
