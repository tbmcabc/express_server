const http = require('http');
const path = require('path');
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const util = require('util');

let md_http = express();

//md_http.use(logger('dev'));
md_http.use(bodyParser.json());
md_http.use(bodyParser.urlencoded({ extended: false }));
md_http.use(cookieParser());
md_http.use(express.static(path.join(__dirname, '../public')));

md_http.use("/log", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	
	let noSignStr = "";
	let sign = "";
	let pid = null;
	if (req.method == "GET"){
		for (let key of Object.keys(req.query).sort()) {
			if (key == "sign") continue;
			noSignStr = noSignStr + util.format("%s=%s&",key,req.query[key]);
		}
		sign = req.query.sign
		pid = req.query.pid
	}
	else if(req.method == "POST"){
		for (let key of Object.keys(req.body).sort()) {
			if (key == "sign") continue;
			noSignStr = noSignStr + util.format("%s=%s&",key,req.body[key]);
		}
		sign = req.body.sign
		pid = req.body.pid
	}
	else{
		return res.json({ ret_msg  : "method not support"})
	}
	if(pid == null){
		return res.json({ ret_code : -1, ret_msg : "params is short"});
	}
	noSignStr = noSignStr + util.format("key=%s",g_configs.AccessSecret);
	let md5 = crypto.createHash('md5');
	let selfSign = md5.update((new Buffer(noSignStr)).toString("utf8")).digest('hex').toLocaleLowerCase();
	if(selfSign != sign){
		return res.json({ret_code : -4, ret_msg :"sign is error"});
	}
	next();	
});

md_http.use("/log", require("./router/logs"))

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