FROM node:20-alpine

# Install necessary dependencies for Puppeteer and Xvfb
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      npm \
      xvfb \
      # Dependencies for xvfb-run
      xorg-server \
      xinit \
      xrandr \
      dbus

# Create xvfb-run script
RUN echo '#!/bin/sh' > /usr/bin/xvfb-run \
    && echo 'Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset &' >> /usr/bin/xvfb-run \
    && echo 'export DISPLAY=:99' >> /usr/bin/xvfb-run \
    && echo '$@' >> /usr/bin/xvfb-run \
    && chmod +x /usr/bin/xvfb-run

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Add and use a non-privileged user
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

USER pptruser

# Command to run the application
CMD ["xvfb-run", "node", "index.js"]
