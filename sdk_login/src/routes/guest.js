const util = require("util")
const crypto = require('crypto');

var guestCfg = [
	{ url:"/baidu_guest" }
]

let PlatFormLoginCheck_guest = function(cfg, token, callback){
	if(token.act == undefined) return callback({ ret_code : -1, ret_msg : "登陆验证失败,错误码1" });
	if(token.head_img == undefined) return callback({ ret_code : -2, ret_msg : "登陆验证失败,错误码2" });
	let act = token.act
	if(act == ""){
		let md5 = crypto.createHash('md5');
		let new_token = md5.update((new Buffer(new Date().getTime() + "")).toString("utf8")).digest('hex').toLocaleLowerCase();
		g_App.sdkloginRedis.evalsha("login_by_baidu_guest", 0, g_App.get_ts(), new_token, function(err, ret){
			if(err) return callback({ ret_code : -1, ret_msg : "数据库错误" });

			let jret = JSON.parse(ret)
			callback({ ret_code:0,plat_act:jret.act,login_type:"BaiduGuest",sex:0, head_img:token.head_img, nick_name : token.act, ext : jret }) 
		});
	}
	else{
		if(token.ext_token == undefined) return callback({ ret_code : -2, ret_msg : "登陆验证失败,错误码3" });
		let md5 = crypto.createHash('md5');
		let new_token = md5.update((new Buffer(new Date().getTime() + "")).toString("utf8")).digest('hex').toLocaleLowerCase();
		g_App.sdkloginRedis.evalsha("login_check_baidu_guest", 0, act, token.ext_token, new_token,  function(err, ret){
			if(err) return callback({ ret_code : -1, ret_msg : "数据库错误" });

			if(ret < 0)  return callback({ ret_code : -1, ret_msg : "登陆验证失败,错误码4" });

			let jret = JSON.parse(ret)
			callback({ ret_code:0,plat_act:act,login_type:"BaiduGuest",sex:0, head_img:token.head_img, nick_name : token.act, ext : jret }) 
		});
	}
	
}


module.exports = {
	cfgs : guestCfg,
	check: PlatFormLoginCheck_guest,
};