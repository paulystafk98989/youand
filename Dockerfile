FROM node:18-bullseye

# ffmpeg para compilar o vídeo
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# deps p/ Chromium do Puppeteer
RUN apt-get update && apt-get install -y \
  gconf-service libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
  libasound2 libatk1.0-0 libatk-bridge2.0-0 libpangocairo-1.0-0 \
  libgtk-3-0 libgbm1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV PUPPETEER_SKIP_DOWNLOAD=false
ENV PUPPETEER_PRODUCT=chrome

EXPOSE 3000
CMD ["npm","start"]
