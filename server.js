'use strict';

const express = require('express');
const amqp = require('amqplib/callback_api');
const multer = require('multer'); // v1.0.5
const upload = multer(); // for parsing multipart/form-data
var stream = require('stream');

// Constants
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// App
const app = express();
let ch = null;
function start() {
  amqp.connect('amqp://rabbitmq', async function (err, conn) {
    if (err) {
      console.log('---------------------------------');
      console.error("[AMQP]", err.message);
      console.log('---------------------------------');
      return setTimeout(start, 5000);
    }
    let error = true;
    let timernum = 1000;
    while (error) {
      try {
        conn.createChannel(function (err, channel) {
          ch = channel;
          console.log('----------------');
          console.log('latex-server connected!');
          console.log('----------------');
        });
        error = false;
      }
      catch (error) {
        console.log('--------------------------------------------------------');
        console.log(error);
        console.log('--------------------------------------------------------');
        console.log("there was an error, trying again in " + (timernum / 1000) + " seconds...");
        const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
        await snooze(timernum);
        timernum *= 2;
      }
    }
  });
}
start();
app.get('/', (req, res) => {
  console.log('hi');
  return res.send('Hello World!');
});

app.get('/favicon.ico', (req, res) => res.status(204));

app.get('/store/:key', async (req, res) => {
  const { key } = req.params;
  const value = req.query;
  //await redisClient.setAsync(key, JSON.stringify(value));
  return res.send('Success');
});

app.post('/pdf', upload.single('file'), async (req, res) => {
  
  res.set('Content-disposition', 'attachment; filename=result.pdf');
  res.set('Content-Type', 'application/pdf');

  enqueue(req, res);
});

async function enqueue(req, res){
  var correlationId = generateUuid();
  await ch.assertQueue('',{durable: true}, function (error, queue) {
        console.log('----------------------------------');
        console.log('returnqueue is: ' + queue.queue);
        console.log('----------------------------------');
    if(error){
      console.log('------------------------------');
      console.log('error asserting ' + queue.queue);
      console.log('------------------------------');
    }
    try {
      ch.consume(queue.queue, function reply(msg) {
        if (msg.properties.correlationId != correlationId) {
          ch.nack(msg);
          return;
        }
  
        var fileContents = Buffer.from(msg.content.buffer, "base64");
  
        var readStream = new stream.PassThrough();
        readStream.end(fileContents);
  
        ch.ack(msg);
        readStream.pipe(res);
      });
        ch.sendToQueue('rpc_queue',
          Buffer.from(req.file.buffer), {
          correlationId: correlationId,
          replyTo: queue.queue
        });
    }
    catch(error){
      console.log('-----------------------------');
      console.log(error);
      console.log('-----------------------------');
    }
  });
}

function generateUuid() {
  return Math.random().toString() +
    Math.random().toString() +
    Math.random().toString();
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
console.log(`Running on http://${HOST}:${PORT}`);

