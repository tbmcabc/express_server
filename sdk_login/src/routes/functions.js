const HDUtils = require("hd-utils")
const express = require('express')
const crypto = require('crypto');
let router = express.Router();

router.post("/c2s_get_auth_code", function(req, res, next){
		res.header("Access-Control-Allow-Origin", "*");

	let phone = req.body.phone
	if(phone == null) return res.json({ ret_code : 1, ret_msg : "缺少参数"});
	g_App.sdkloginRedis.evalsha("login_get_auth_code", 0, phone, g_App.get_ts(), function(err, ret){
		if(err) return res.json({ ret_code : 2, ret_msg : "数据库错误，请稍后再试！" });
		let jret = JSON.parse(ret);
		if(jret.msg != null) return res.json({ ret_code : 3, ret_msg : jret.msg });
		HDUtils.SMS.SendSMSCode({phone : phone, argv : jret.code, cb : (smscode) =>{
	        if (smscode == '000000')
	        	res.json({ ret_code : 0, ret_msg : "发送验证码成功,请注意手机短信！" });
	        else
	        	res.json({ ret_code : 4, ret_msg : "发送验证码失败!" });
	    }}, g_configs.sms_config);
	});
});

router.post("/c2s_guest_bind_phone", function(req, res, next){
	res.header("Access-Control-Allow-Origin", "*");
	let act = req.body.act
	let phone = req.body.phone
	let code = req.body.code
	let sign = req.body.sign

	if(act == undefined) return res.json({ ret_code : 1, ret_msg : "绑定失败，错误码1" });
	if(phone == undefined) return res.json({ ret_code : 2, ret_msg : "绑定失败，错误码2" });
	if(code == undefined) return res.json({ ret_code : 3, ret_msg : "绑定失败，错误码3" });
	if(sign == undefined) return res.json({ ret_code : 4, ret_msg : "绑定失败，错误码4" });


	g_App.sdkloginRedis.call("hget", "baidu_guest", act, function(err, ret){
		if(err) return res.json({ ret_code : 2, ret_msg : "数据库错误，请稍后再试！" });
		if(ret == null) return res.json({ ret_code : 5, ret_msg : "绑定失败，错误码5" });

		let md5 = crypto.createHash('md5');
		let self_sign = md5.update((new Buffer(act + phone + code + ret)).toString("utf8")).digest('hex').toLocaleLowerCase();
		if(self_sign != sign) return res.json({ ret_code : 2, ret_msg : "签名错误" });

		g_App.sdkloginRedis.call("hget", "phone_auth_code", phone, function(err, ret){
			if(err) return res.json({ ret_code : 2, ret_msg : "数据库错误，请稍后再试！" });

			let jret = JSON.parse(ret)
			if(jret.code != Number(code)) return res.json({ ret_code : 4, ret_msg : "你输入的验证码错误！" });

			g_App.sdkloginRedis.evalsha("login_baidu_bind_phone", 0, act, phone, function(err, ret){
				if(err) return res.json({ ret_code : 2, ret_msg : "数据库错误，请稍后再试！" });

				res.send(ret)
			});
		});
	});
});
module.exports = router;