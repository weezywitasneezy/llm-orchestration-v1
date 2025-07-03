# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Create data directory for SQLite if it doesn't exist
RUN mkdir -p ./data

# Start the server
CMD ["node", "server.js"]
