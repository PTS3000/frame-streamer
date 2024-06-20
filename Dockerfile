# Use an official base image
FROM oven/bun:latest

# Define arguments with default values if they are not provided
ARG PORT=3000

# Set the working directory
WORKDIR /app

# Install the necessary libraries for Puppeteer
RUN apt-get update && apt-get install -y \
  libgconf-2-4 \
  libnss3 \
  libxss1 \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libgbm1 \
  libgtk-3-0 \
  libpango-1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgobject-2.0-0 \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Copy the application code after dependencies are installed
COPY . /app

# Install Bun dependencies and Puppeteer browsers
RUN bun install
RUN bunx puppeteer browsers install chrome

# Expose the port the app runs on
EXPOSE $PORT

# Command to run the application
CMD ["bun", "run", "start"]
