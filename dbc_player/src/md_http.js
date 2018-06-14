const http = require('http');
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const util = require('util');

let md_http = express();

// md_http.use(logger('dev'));
md_http.use(bodyParser.json());
md_http.use(bodyParser.urlencoded({ extended: false }));
md_http.use(cookieParser());


md_http.use("/player", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	return next();	
	let noSignStr = "";
	let sign = "";
	let pid = 0;
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
		return res.json({ ret_code : -1, ret_msg : "方法不合法"})
	}
	if(pid == "" || pid == null){
		return res.json({ ret_code : -2, ret_msg : "param is short"})
	}

	g_App.gamecomRedis.call("hgetall", `login_auth_${pid}`, function (err, ret) {
		if(err) return console.log(err);
		if(ret == null) return res.json({ ret_code : -1000});
		if(g_App.checkDbidValid(ret.dbid) == false) {
			return res.json({ ret_code : -3, ret_msg : "dbid is error"});
		}
		noSignStr = noSignStr + util.format("key=%s",ret.token);
		let md5 = crypto.createHash('md5');
		let selfSign = md5.update((new Buffer(noSignStr)).toString("utf8")).digest('hex').toLocaleLowerCase();
		if(selfSign != sign){
			console.log(noSignStr, sign, selfSign)
			g_App.log_access_error.error(`${noSignStr}:${sign}:${selfSign}`)
			return res.json({ ret_code : -3, ret_msg : "sign is error"});
		}
		next();	
	});
});

md_http.use("/player", require("./router/msg_client"))
md_http.use("/player", require("./router/toy_live"))
md_http.use("/player", require("./router/toy_gold"))
md_http.use("/player", require("./router/toy_self"))
md_http.use("/player", require("./router/toy_vr"))
md_http.use("/player", require("./router/toy_h5"))
md_http.use("/player", require("./router/toy_indiana"))
md_http.use("/player", require("./router/h5_bridge"))
md_http.use("/player", require("./router/sign"))
md_http.use("/player", require("./router/free_gold"))
md_http.use("/player", require("./router/invite"))
md_http.use("/player", require("./router/reversalact"))
md_http.use("/player", require("./router/trinity"))
md_http.use("/player", require("./router/toy_rushhour"))
md_http.use("/player", require("./router/toy_vr_room"))
md_http.use("/player", require("./router/ddz"))
//md_http.use("/player", require("./router/third"))
//md_http.use("/player", require("./router/growth"))

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