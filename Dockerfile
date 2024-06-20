# Use an official base image
FROM oven/bun:latest

# Define arguments with default values if they are not provided
ARG PORT=3000
# Copy the application code
COPY . /app

# Set the working directory
WORKDIR /app

RUN bun --revision
RUN bun install 
RUN bunx puppeteer browsers install chrome

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["bun", "./index.js"]