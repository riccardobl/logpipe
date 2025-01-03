
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install
ADD src /app/src
EXPOSE 7068
CMD ["npm", "run", "start"]