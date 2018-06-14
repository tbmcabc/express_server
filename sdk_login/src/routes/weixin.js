const util = require("util")
const https = require('https');
const wx_utils = require("../utils/wx_utils")

var weixinCfg = [
	{ url:"/Weixin" },
]

var WebChatCfg = {}
WebChatCfg["wxe984532350035d07"] = { appid: "wxe984532350035d07", appsecret:"0132683b44e4551629c2f45f854bbb2b" }

let PlatFormLoginCheck_WebChat = function(cfg, token, callback){
	let wxCfg = WebChatCfg[token.appid]
	if(wxCfg == null){
		callback({ret_code:1,ret_msg:"找不到配置"})
		return
	}
	wx_utils.checkCodeInvild(token.act, wxCfg, function(err, ret){
         if(err) return callback({ret_code:2,ret_msg:err})

         wx_utils.getUserWxData(ret, function(err, wxData){
	        if(err) return callback({ret_code:3,ret_msg:err})

	     	let nickname = new Buffer(wxData.nickname).toString("utf8")
	     	callback({ret_code:0,
     			plat_act:wxData.unionid,
     			login_type:"WebChat",
     			plat_params:wxData.openid, 
     			nick_name:nickname, 
     			sex:0,
     			head_img:wxData.headimgurl});
	    })
    });
}


module.exports = {
	cfgs : weixinCfg,
	check: PlatFormLoginCheck_WebChat,
};
