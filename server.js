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
amqp.connect('amqp://rabbitmq', function (err, conn) {
  conn.createChannel(function (err, channel) {
    ch = channel;
  });
});

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

  var correlationId = generateUuid();

  ch.consume('rpc_queue_response', function reply(msg) {
    if (msg.properties.correlationId != correlationId) {
      ch.nack(msg);
      return;
    }

    var fileContents = Buffer.from(msg.content.buffer, "base64");

    var readStream = new stream.PassThrough();
    readStream.end(fileContents);

    res.set('Content-disposition', 'attachment; filename=result.pdf');
    res.set('Content-Type', 'application/pdf');

    ch.ack(msg);
    readStream.pipe(res);
  });

  ch.sendToQueue('rpc_queue',
    Buffer.from(req.file.buffer), {
    correlationId: correlationId,
    replyTo: 'rpc_queue_response'
  });
});

app.get('/:key', async (req, res) => {
  const { key } = req.params;
  //const rawData = await redisClient.getAsync(key);
  console.log(key);
  var value = key ? +JSON.parse("").hi : null;
  return res.json(value);
});

function generateUuid() {
  return Math.random().toString() +
    Math.random().toString() +
    Math.random().toString();
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
console.log(`Running on http://${HOST}:${PORT}`);

