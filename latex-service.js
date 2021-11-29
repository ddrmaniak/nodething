#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
const { _, execSync } = require("child_process");
const rabbit = require('./rabbithelper');
var fs = require("fs");
rabbit.pop('rpc_queue', getLatexData, 'latex-service');

function getLatexData(data, guid) {
  let tempfolder = fs.mkdtempSync('latex-service');
  fs.writeFileSync(tempfolder + '/' + guid + '.tex', data);
  execSync("pdflatex -output-directory=" + tempfolder + ' ' + tempfolder + '/' + guid + ".tex", (error, stdout, stderr) => {
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
  let result = fs.readFileSync(tempfolder + '/' + guid + '.pdf');
  fs.rmdirSync(tempfolder, {recursive: true});
  return result;
}