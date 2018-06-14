const util = require("util")

var windowsCfg = [
	{ url:"/windows" }
]

let PlatFormLoginCheck_windows = function(cfg, token, callback){
	if(token.act == undefined) return callback({ ret_code : 1, ret_msg : "缺少参数" });
	callback({ ret_code:0,plat_act:token.act,login_type:"Windows",sex:0, head_img:"" }) 
}


module.exports = {
	cfgs : windowsCfg,
	check: PlatFormLoginCheck_windows,
};