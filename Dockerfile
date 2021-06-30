FROM node:16
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install 
RUN npm install amqplib
RUN apt-get update 
RUN apt-get --no-install-recommends install -y texlive-full
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .
COPY ./boot.sh /sbin/boot.sh
COPY ./latex.init /etc/service/latex/run
COPY ./latex-service.js /root/latex-service.js

EXPOSE 3000
CMD ["/sbin/boot.sh"]