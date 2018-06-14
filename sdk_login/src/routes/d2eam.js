const crypto = require("crypto")
var d2eamCfg = [
	{ url:"/d2eam" }
]


function JieMI(str){
    var decipher = crypto.createDecipher("aes-128-ecb", "%==Aa10O01aA==%");
    var dec = decipher.update(str, "hex", "utf8");//编码方式从hex转为utf-8;
    dec += decipher.final("utf8");//编码方式从utf-8;
    return JSON.parse(dec);
}

let PlatFormLoginCheck_d2eam = function(cfg, token, callback){
	if(token.userId == undefined) return callback({ ret_code : 1, ret_msg : "登陆验证失败,错误码1" });
	if(token.sex == undefined) return callback({ ret_code : 2, ret_msg : "登陆验证失败,错误码2" });
	if(token.userImg == undefined) return callback({ ret_code : 3, ret_msg : "登陆验证失败,错误码3" });
	if(token.nickname == undefined) return callback({ ret_code : 4, ret_msg : "登陆验证失败,错误码4" });
	if(token.d2eam_token == undefined) return callback({ ret_code : 4, ret_msg : "登陆验证失败,错误码5" });

	try{
		let rt = JieMI(token.d2eam_token)
		callback({ ret_code:0, plat_act:rt.acc,login_type:"D2eam",sex:token.sex, head_img:token.userImg, nick_name : token.nickname, xg_token : token.xgToken }) 	
	}catch(e){
		return callback({ ret_code : 5, ret_msg : "登陆验证失败" });
	}
}


module.exports = {
	cfgs : d2eamCfg,
	check: PlatFormLoginCheck_d2eam,
};