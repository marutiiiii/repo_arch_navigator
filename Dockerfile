# Node runtime matching Vite + React 18
FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy project source
COPY . .

# Expose Vite dev server port (configured to 8080 in vite.config.ts)
EXPOSE 8080

# Run Vite dev server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
