#!/usr/bin/env node
// 引用相關模組
const app = require('../app'); // 引用app.js模組 (app.js了匯出app物件)
const debug = require('debug')('node-mathbmi:server');
const http = require('http');

// 設定連接埠port由環境變數PORT決定或預設使用3000
let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// 建立http伺服器，並使用express物件app來處理請求
let server = http.createServer(app);
// 設定http server的傾聽連接埠
server.listen(port);

// 設定http server的事件(error及listening)處理函數
server.on('error', onError);
server.on('listening', onListening);

// 正規化port函數
function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// 錯誤處理函數
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// HTTP Server的傾聽事件處理函數
function onListening() {
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

// 取得並列出Server端的ip，需在專案中安裝underscore模組: npm install underscore --save
const sip = require('underscore').chain(require('os').networkInterfaces()).values()
    .flatten().find({family: 'IPv4', internal: false}).value().address;
console.log(`Server IP= ${sip}:${port}`);
