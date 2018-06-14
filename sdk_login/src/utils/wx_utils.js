var xml2js = require('xml2js')
var crypto = require('crypto');
var util = require('util')
var https = require('https')
var http = require('http')
var fs = require('fs')

var sendHttpsGetRequest = function(url, callback){
	https.get(url, function(res){
		var resdata = ""
        res.setEncoding('utf8');
        res.on('data', function(data){
            resdata+=data
        });
        res.on('error', function(err){
            callback(err,null);
        });
        res.on('end', function(err){
            callback(null,resdata);
        });
	}).on("error", function (err) {  
		callback(err, null)
    }); 
}

var sendWxHttpPostRequest = function (host, path, content, callback) {
        var options = {  
            method: "POST",  
            host: host,  
            port: 443,  
            path: path,
            headers: {  
                "Content-Type": 'application/x-www-form-urlencoded;',  
            }  
        };  

        var reqq = https.request(options, function(ress){
        	var resdata = ""
            ress.setEncoding('utf8');
            ress.on('data', function(data){
                resdata+=data
            });
            ress.on('error', function(err){
                callback(err,null);
            });
            ress.on('end', function(err){
                callback(null,resdata);
            });
        });

        reqq.on('error', function(err){
            callback(err,null);
        });

        reqq.write(content);
        reqq.end();
}

exports.checkCodeInvild = function (code, wxcfg, callback) {
	var url = util.format("https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code",
		wxcfg.appid,
		wxcfg.appsecret,
		code)
	sendHttpsGetRequest(url, function(err, result){
		if(err){
			callback(err, null)
		    return
		}
		var ret = JSON.parse(result)
		if(ret.openid)
			callback(null, ret)
		else
			callback(ret.errmsg, null)	
	});
}

var lastAccessToken = ""
var lastTimestamp = 0
var getWxAccessToken = function(wxcfg, callback){
	var nowtime = new Date().getTime() / 1000
	if(nowtime > lastTimestamp || lastAccessToken == ""){
		var url = util.format("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s", wxcfg.appid, wxcfg.appsecret)
		sendHttpsGetRequest(url, function(err, result){
			if(err) return callback(err, null)
			
			var ret = JSON.parse(result)
        	if(ret.access_token){
        		lastAccessToken = ret.access_token
        		lastTimestamp = nowtime + ret.expires_in - 120
        		callback(null,lastAccessToken);	
        	}
        	else
        		callback(ret.errmsg, null);		
		})
	}
	else
		callback(null, lastAccessToken)
}

var lastJsApiTicket = ""
var lastJsApiTimestamp = 0
var getWxJsApiTickets = function(wxcfg, callback) {
	var nowtime = new Date().getTime() / 1000
	if(nowtime > lastJsApiTimestamp || lastJsApiTicket == ""){
		getWxAccessToken(wxcfg, function(err, token){
			if(err) return callback(err, null)
			var url = util.format("https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=%s&type=jsapi", token)
			sendHttpsGetRequest(url, function(err, result){
				if(err) return callback(err, null)
				
				var ret = JSON.parse(result)
	        	if(ret.errcode == 0){
	        		lastJsApiTicket = ret.ticket
	        		lastJsApiTimestamp = nowtime + ret.expires_in - 120
	        		callback(null, lastJsApiTicket);	
	        	}
	        	else
	        		callback(ret.errmsg, null);		
			});
		});
	}
	else
		callback(null, lastJsApiTicket)
}

exports.getUserWxData = function (ret, callback) {
	var url = util.format("https://api.weixin.qq.com/sns/userinfo?access_token=%s&openid=%s&lang=zh_CN", ret.access_token, ret.openid)
	sendHttpsGetRequest(url, function(err, result){
		if(err)
			return callback(err, null)
		
		var _ret = JSON.parse(result)
		if(_ret.errcode){
			return callback(_ret.errmsg, null)
		}
		callback(null, _ret)
	})
}

exports.downloadFile = function(url,path){
    http.get(url, function(res){
        var imgData = "";
        res.setEncoding("binary"); //一定要设置response的编码为binary否则会下载下来的图片打不开

        res.on("data", function(chunk){
            imgData+=chunk;
        });

        res.on("end", function(){
            fs.writeFile(path, imgData, "binary", function(err){
                if(err){
                    console.log(err);
                    return
                }
                console.log("downloadfile:" + path + " success")
            });
        });
    });
}

exports.getJsApiConfig = function(wxcfg, url, callback){
	getWxJsApiTickets(wxcfg, function(err, ticket){
		if(err) callback(err, null)
		var timestamp =  Math.floor(new Date().getTime() / 1000)
		var noncestr = timestamp
		var strNoSign = util.format("jsapi_ticket=%s&noncestr=%s&timestamp=%s&url=%s",
			ticket,
			noncestr,
			timestamp,
			url);
		var sha = crypto.createHash('sha1');
		sha.update(strNoSign, "utf8");
		var sign = sha.digest('hex');
		var cfg = {}
		cfg.appId = wxcfg.appid
		cfg.timestamp = timestamp
		cfg.nonceStr = noncestr
		cfg.signature = sign
		callback(null, cfg)
	});
}

//--------------------------充值生成订单相关----------------
var RequestOrderData = "<xml>"
        + "<appid>%s</appid>"
        + "<mch_id>%s</mch_id>"
        + "<nonce_str>%s</nonce_str>"
        + "<body>%s</body>"
        + "<attach>%s</attach>"
        + "<out_trade_no>%s</out_trade_no>"
        + "<total_fee>%s</total_fee>"
        + "<spbill_create_ip>%s</spbill_create_ip>"
        + "<notify_url>%s</notify_url>"
        + "<trade_type>JSAPI</trade_type>"
        + "<openid>%s</openid>"
        + "<sign>%s</sign>"
        + "</xml>";
var NoSignStr = "appid=%s"
		+ "&attach=%s"
        + "&body=%s&mch_id=%s"
        + "&nonce_str=%s&notify_url=%s"
        + "&openid=%s&out_trade_no=%s&spbill_create_ip=%s&total_fee=%s&trade_type=JSAPI&key=%s";

var NoSignPayStr="appId=%s&nonceStr=%s&package=%s&signType=MD5&timeStamp=%s&key=%s";

exports.genWxOrder = function(req, openid, out_order_no, money, productName, attach, callback) {
	var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
	if (ip.substr(0, 7) == "::ffff:") {
	  ip = ip.substr(7)
	}
	var nowTime = new Date().getTime();
	var strtime = nowTime.toString();
	var beginIndex = out_order_no.length + strtime.length - 30
	if(beginIndex < 0) beginIndex = 0;
	out_order_no = out_order_no + '-' + strtime.substring(beginIndex)

	var strNoSign = util.format(NoSignStr,
		config.wx_appid,
		attach,
		productName,
		config.wx_payid,
		nowTime,
		config.wx_notifyurl,
		openid,
		out_order_no,
		ip,
		money,
		config.wx_paykey)

	console.log(strNoSign)
	var md5 = crypto.createHash('md5');
	var sign = md5.update((new Buffer(strNoSign)).toString("utf8")).digest('hex').toLocaleUpperCase();
	var request = util.format(RequestOrderData,
		config.wx_appid,
		config.wx_payid,
		nowTime,
		productName,
		attach,
		out_order_no,
		money,
		ip,
		config.wx_notifyurl,
		openid,
		sign);

	console.log(request)

	sendWxHttpPostRequest('api.mch.weixin.qq.com', '/pay/unifiedorder', request, function (err,response) {
		if (err) {
				callback(err,null);
				return;
		}
		xml2js.parseString(response, function (err, result) {
		    var json = result.xml
		    if(json.return_code == "SUCCESS" && json.return_msg == "OK"){
		    	//这里生成调用微信支付所需要的参数
		    	var requestJson = {}
		    	requestJson.appId = config.wx_appid;
		    	requestJson.package = 'prepay_id=' + json.prepay_id;
		    	requestJson.timeStamp = new Date().getTime();
		    	requestJson.nonceStr =  new Date().getTime();
		    	var strSign = util.format(NoSignPayStr, requestJson.appId, requestJson.nonceStr, requestJson.package, requestJson.timeStamp, config.wx_paykey);
		    	var md5 = crypto.createHash('md5');
		    	requestJson.paySign = md5.update(strSign).digest('hex').toLocaleUpperCase();
		    	callback(null, requestJson);
		    }
		    else{
		    	callback(json.return_msg,null);
			}
		});
	});
}
