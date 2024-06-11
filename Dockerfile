# Use the official Node.js 14 image.
FROM node:14

# Set the working directory
WORKDIR /src

# Add package.json and package-lock.json to the working directory
COPY package.json package-lock.json /src/

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . /src

# Install development dependencies
RUN npm install --only=dev

# Build the application
RUN npm run build

# Expose the port that the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "build/index.js"]
