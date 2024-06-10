# Use the official Node.js 14 image.
FROM node:14

# Set the working directory
WORKDIR /src

# Add package.json and package-lock.json to the working directory
ADD package.json /src/package.json
ADD package-lock.json /src/package-lock.json

# Install dependencies
RUN npm install

# Copy the rest of the application code
ADD . /src

# Build the application
RUN npm run build

# Expose the port that the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "build/index.js"]