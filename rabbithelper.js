var amqp = require('amqplib/callback_api');
const { v4: uuidv4 } = require('uuid');

let ch = undefined;
let pop = async function (queue, callback, appname) {
  let listen = function (channel) {
    ch.assertQueue(queue, {
      durable: false
    });
    channel.prefetch(1);
    channel.consume(queue, function reply(msg) {
      var n = msg.content.toString();
      console.log("replyto: " + msg.properties.replyTo);
      var r = callback(n, msg.properties.correlationId);
      console.log(r);
      channel.sendToQueue(msg.properties.replyTo,
        Buffer.from(r), {
        correlationId: msg.properties.correlationId
      });
      channel.ack(msg);
    });
  }
  if (!ch) {
    start(appname, listen);
  }
  else {
    listen(ch)
  }
}

let push = async function (queueName, req, callback) {
  var correlationId = uuidv4();
  await ch.assertQueue('', { durable: true }, function (error, queue) {
    console.log('----------------------------------');
    console.log('returnqueue is: ' + queue.queue);
    console.log('----------------------------------');
    if (error) {
      console.log('------------------------------');
      console.log('error asserting ' + queue.queue);
      console.log('------------------------------');
    }
    try {
      ch.consume(queue.queue, function reply(msg) {
        if (msg.properties.correlationId != correlationId) {
          console.log('NACK on the push receipt');
          ch.nack(msg);
          return;
        }
        ch.ack(msg);
        callback(msg.content);
      });
      ch.sendToQueue(queueName,
        Buffer.from(req.file.buffer), {
        correlationId: correlationId,
        replyTo: queue.queue
      });
    }
    catch (error) {
      console.log('-----------------------------');
      console.log(error);
      console.log('-----------------------------');
    }
  });
}

let start = async function start(name, callback) {
  let connection = await amqp.connect('amqp://rabbitmq', async function (err, conn) {
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
        await conn.createChannel(async function (err, channel) {
          ch = channel;
          console.log('----------------');
          console.log(name + ' connected!');
          console.log('----------------');
          if (!!callback) {
            callback(ch);
          }
        });
        error = false;
      }
      catch (error) {
        console.log('--------------------------------------------------------');
        console.log(error);
        console.log("there was an error, trying again in " + (timernum / 1000) + " seconds...");
        console.log('--------------------------------------------------------');
        const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
        await snooze(timernum);
        timernum *= 2;
      }
    }
  });
}

exports.push = push;
exports.pop = pop;
exports.start = start;