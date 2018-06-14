const crypto = require("crypto")
const http = require("http")

var d2eamCfg = [
	{ url:"/d2eam_v2" }
]

let PlatFormLoginCheck_d2eam = function(cfg, token, callback){
	if(token.short_token == undefined) return callback({ ret_code : 1, ret_msg : "登陆验证失败,错误码1" });

	let short_token = token.short_token
	http.get("http://logintest.guodong.com/token?token=" + short_token, function(req, ress) {
			var json = '';  
			req.on('data', function(data) {
				json += data;  
			});  
			req.on('end', function(){  
				var jsonOBJ = JSON.parse(json);
				if(jsonOBJ.ret == 0 && jsonOBJ.userinfo != null && jsonOBJ.userinfo.ret == 0){
					let sex = 0;
					if(jsonOBJ.userinfo.gender == "男") sex = 1;
					else if(jsonOBJ.userinfo.gender == "女") sex = 2;
					callback({ ret_code:0, plat_act:jsonOBJ.openid,login_type:"D2eamV2",sex: sex, head_img:jsonOBJ.userinfo.figureurl_qq_2, nick_name : jsonOBJ.userinfo.nickname }) 	
				}
				else{
					callback({ ret_code : 3, ret_msg : "登陆验证失败,错误码3" });			
				}
			});  
	}).on('error', (e) => {
		callback({ ret_code : 2, ret_msg : "登陆验证失败,错误码2" });
    });
}


module.exports = {
	cfgs : d2eamCfg,
	check: PlatFormLoginCheck_d2eam,
};