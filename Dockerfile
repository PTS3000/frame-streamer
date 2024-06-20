FROM alpine

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Define arguments with default values if they are not provided
ARG PORT=3000
# Copy the application code
COPY . /app

# Set the working directory
WORKDIR /app

RUN yarn add puppeteer@13.5.0 
RUN yarn install 

# Expose the port the app runs on
EXPOSE 3000

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser
# Command to run the application
CMD ["node", "./index.js"]