const http = require('http');
const path = require('path');
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const util = require('util');

let md_http = express();

md_http.use(logger('dev'));
md_http.use(bodyParser.json());
md_http.use(bodyParser.urlencoded({ extended: false }));
md_http.use(cookieParser());
md_http.use(express.static(path.join(__dirname, '../public')));


md_http.use("/d2eam/sku", require("./router/sku"))
md_http.use("/d2eam/sdk", require("./router/pay"))
md_http.use("/d2eam/back", require("./router/back"))
md_http.use("/third", require("./router/third"))
md_http.use("/tx", require("./router/tx"))
md_http.use("/ddz", require("./router/ddz_result"))

// catch 404 and forward to error handler
md_http.use(function(req, res, next) {
	res.send("run health")
});

// error handler
md_http.use(function(err, req, res, next) {
	g_App.log_http_error.error(err)
  	res.send("run health!!")
});

md_http.set('port', g_configs.http_cfg.port);

md_http.start = function(){
	let http_srv = http.createServer(md_http);
	http_srv.listen(g_configs.http_cfg.port);
	http_srv.on('listening', function () {
	  var addr = http_srv.address();
	  var bind = typeof addr === 'string'
	    ? 'pipe ' + addr
	    : 'port ' + addr.port;
	  console.log('http_srv start at:' + bind);
	});
	http_srv.on('error', function (error) {
	  if (error.syscall !== 'listen') {
	    throw error;
	  }

	  var bind = typeof g_configs.http_cfg.port === 'string'
	    ? 'Pipe ' + g_configs.http_cfg.port
	    : 'Port ' + g_configs.http_cfg.port;

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
	});
}

module.exports = md_http;
