FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN chmod +x ./start.sh || true
EXPOSE 8080
CMD ["sh","./start.sh"]
