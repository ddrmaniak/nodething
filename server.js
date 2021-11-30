'use strict';

const express = require('express');
const multer = require('multer'); // v1.0.5
const upload = multer(); // for parsing multipart/form-data
const rabbit = require('./rabbithelper');
var stream = require('stream');

// Constants
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// App
const app = express();
let ch = null;
rabbit.start('latex-server');
app.get('/', (req, res) => {
  return res.sendFile(__dirname + '/nodesubmit.html');
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
  if(!req.file) readStream.pipe(res);
  rabbit.push('rpc_queue', req, (msg)=>{
    var fileContents = Buffer.from(msg.buffer, "base64");
    
    var readStream = new stream.PassThrough();
    readStream.end(fileContents);

    readStream.pipe(res);
  });
});


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
console.log(`Running on http://${HOST}:${PORT}`);

