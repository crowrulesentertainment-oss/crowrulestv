FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates  && pip3 install --break-system-packages --no-cache-dir yt-dlp==2025.11.12  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8788
EXPOSE 8788
CMD ["node","src/server.js"]
