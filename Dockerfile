# Use an official base image
FROM oven/bun:latest

# Define arguments with default values if they are not provided
ARG PORT=3000
# Copy the application code
COPY . /app

# Set the working directory
WORKDIR /app

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
  libgobject-2.0-0

RUN bun --revision
RUN bun install 
RUN bunx puppeteer browsers install chrome

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["bun", "./index.js"]