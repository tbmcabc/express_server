const express = require('express')
const crypto = require('crypto')
const util = require("util")
let router = express.Router();


let privateEncrypt = function(privatekey, content){
	let input = Buffer.from(content)
	let output = Buffer.alloc(2048)
	let input_offset = 0
	let output_offset = 0
	while(input_offset < input.length){
		let len = 0
		if (input.length - input_offset >= 117) len = 117;
		else len = input.length - input_offset;

		let buf = Buffer.alloc(len)
		input.copy(buf, 0, input_offset, input_offset + len)
		let out = crypto.privateEncrypt(privatekey, buf);
		out.copy(output, output_offset, 0, out.length)
		output_offset = output_offset + out.length
		input_offset = input_offset + len
	}
	let sign = Buffer.alloc(output_offset)
	output.copy(sign, 0, 0, output_offset)
	return sign
}


let ggaddress_index = 0
let doGetGGAddress = function(){
	ggaddress_index++;
	if(ggaddress_index >= g_configs.game_gate_urls.length) ggaddress_index = 0;
	
	let ggaddress = g_configs.game_gate_urls[ggaddress_index]
    return ggaddress
}

let doCheckPlatformLogin = function(plat, cfg, req, res){
	res.header("Access-Control-Allow-Origin", "*");
	let ver = req.headers["app-ver"]
	var plat_id = req.body.plat_id
	var deviceid = req.body.deviceid
	if (plat_id == null) return res.json({ret_code:-1, ret_msg:"平台ID不能为空"});
	let token = JSON.parse(req.body.token)
	plat.check(cfg, token, function(rs){
		//-每一次验证结果写一次文件日志
		if(rs.ret_code == 0){//0表示平台验证成功
			g_App.mysqlCli.query("call p_plat_user_login(?,?,?,?)",[rs.plat_act, deviceid, rs.login_type, plat_id],function(err,rows,fileds){
				if(err){
					res.json({ret_code:2, ret_msg:"数据库错误!!"});
					g_App.log_login.error(`${cfg.url}:${req.body.token}:${err}`)
					return console.log(err);
				}

				let dbrs = rows[0][0]

				if(dbrs.err_msg != null){
					return res.json({ret_code:3, ret_msg:dbrs.err_msg});
				}

				let params = { sex: rs.sex, 
					nick_name: rs.nick_name,
					head_img: rs.head_img, 
					plat_act: rs.plat_act,
					plat_id: dbrs.plat_id,
					channel : dbrs.channel }
				if(!params.nick_name) params.nick_name = dbrs.playerid + "";
				let xg_token = rs.xg_token
				if(!xg_token) xg_token = "";
				let token = JSON.stringify({ pid:dbrs.playerid, dbid:dbrs.dbid, params:JSON.stringify(params), timestamp: Math.floor(new Date().getTime()/1000) })
				let sign =privateEncrypt(g_configs.rsa.privateKey, token).toString("hex");
				res.json({ret_code:0, ggaddress: doGetGGAddress(), ggwssaddress : g_configs.wss_game_gate_url, http_srv_url: g_configs.http_srvs_url, https_srv_url : g_configs.https_srvs_url, token: sign, ext:rs.ext, access_secret : g_configs.AccessSecret});

				let ip = req.headers['x-forwarded-for'] ||
				        req.connection.remoteAddress ||
				        req.socket.remoteAddress ||
				        req.connection.socket.remoteAddress;
				if (ip.substr(0, 7) == "::ffff:") {
				  	ip = ip.substr(7)
				}
				g_App.sdkloginRedis.evalsha("on_player_login", 0, 
					rs.plat_act,
					dbrs.playerid,
					dbrs.plat_id,
					new Date().toLocaleString(),
					ip, xg_token, ver, dbrs.dbid,function(err, ret){
						if(err) return console.log(err);
					});
			});
		}
		else{
			let ret = JSON.stringify(rs)
			res.send(ret);
			g_App.log_login.error(`${cfg.url}:${req.body.token}:${ret}`)
		}

	});
};

let RegisterLoginPlatform = function (plat) {
	plat.cfgs.forEach(function(cfg){  
		router.post(cfg.url, function(req, res) {
			doCheckPlatformLogin(plat, cfg, req, res);
		});
	});
};

//RegisterLoginPlatform(require('./weixin'));
RegisterLoginPlatform(require('./phone'));
RegisterLoginPlatform(require('./guest'));
RegisterLoginPlatform(require('./d2eam'));
RegisterLoginPlatform(require('./d2eam_v2'));

module.exports = router;
	