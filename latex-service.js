#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
const { _, execSync } = require("child_process");
var fs = require("fs");
let ch = null;
start();

function start(){
  amqp.connect('amqp://rabbitmq', function (err, connection) {
    if (err) {
      console.log('---------------------------------');
      console.error("[AMQP]", err.message);
      console.log('---------------------------------');
      return setTimeout(start, 5000);
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }
      var queue = 'rpc_queue';
      console.log('----------------');
      console.log('latex-service connected!');
      console.log('----------------');
  
      channel.assertQueue(queue, {
        durable: false
      });
      channel.prefetch(1);
      channel.consume(queue, function reply(msg) {
        
        var n = msg.content.toString();
        console.log("replyto: " + msg.properties.replyTo);
        var r = getLatexData(n);
        console.log(r);
        channel.sendToQueue(msg.properties.replyTo,
          Buffer.from(r), {
            correlationId: msg.properties.correlationId
          });
  
        channel.ack(msg);
      });
    });
  });
}

function getLatexData(data, guid) {
  fs.writeFileSync(guid + '.tex', data);
  execSync("pdflatex " + guid + ".tex", (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
  });
  return fs.readFileSync(guid + '.pdf');
}