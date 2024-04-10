FROM node:latest

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --force

# Bundle app source
COPY . .

RUN npx prisma migrate deploy
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 3000

# Run the application
CMD ["npm", "start"]
