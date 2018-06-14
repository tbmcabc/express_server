const http = require("http");
const express = require('express');
const logger = require('morgan');
const log4js = require("log4js")
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
let md_http = express();

md_http.use(logger('dev'));
md_http.use(bodyParser.json());
md_http.use(bodyParser.urlencoded({ extended: false }));
md_http.use(cookieParser());

md_http.use('/', require('./routes/manager'));
md_http.use('/', require('./routes/functions'));

// catch 404 and forward to error handler
md_http.use(function(req, res, next) {
	res.json({ret_code : -2000, ret_msg : "not found handler"})
});

// error handler
md_http.use(function(err, req, res, next) {
  	res.json({ret_code : -2000, ret_msg : "not found handler"})
  	g_App.log_http_error.error(err)
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
