const util = require("util")

let phoneCfg = [
	{ url:"/phone" }
]

let PlatFormLoginCheck_phone = function(cfg, token, callback){
	if(token.phone == undefined || token.auth_code == undefined) return callback({ ret_code : 1, ret_msg : "缺少参数" });

	g_App.sdkloginRedis.evalsha("login_submit_phone", 0, token.phone, token.auth_code, g_App.get_ts(), function(err, ret){
		if(err) return callback({ ret_code : 2, ret_msg : "数据库错误，请稍后再试！!" });
		let jret = JSON.parse(ret);
		if (jret.msg != null) return callback({ ret_code : 3, ret_msg : jret.msg });

		callback({ ret_code:0,plat_act:jret.act,login_type:"Phone",sex:0, head_img:"", ext : jret}) 		
	});
		
}


module.exports = {
	cfgs : phoneCfg,
	check: PlatFormLoginCheck_phone,
};