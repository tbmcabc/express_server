const express = require('express')
let router = express.Router();

router.get("/check_token", function(req, res, next){ 
	let token = req.query.token
	if(token == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数token"})
	g_App.gamecomRedis.call("hget", "third_authorization_token_val", token, function(err, ret){
		if(err) return console.log(err);
		if(ret == null) return res.json({ ret_code : -1, ret_msg : "token不合法"})
		let jret = JSON.parse(ret)
		res.json({ ret_code : 0, account : jret.pid+"" })
	});
});

router.get("/get_user_info", function(req, res, next){
	let token = req.query.token
	if(token == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数token"})
	g_App.gamecomRedis.call("hget", "third_authorization_token_val", token, function(err, ret){
		if(err) return console.log(err);
		if(ret == null) return res.json({ ret_code : -1, ret_msg : "token不合法"})
		let jret = JSON.parse(ret)
		g_App.ThirdSystem.push_cmd_to_player(jret.sid, "get_user_info", {
			pid : Number(jret.pid)
		}, function(err, ret){
			if(err) return console.log(err);
			res.json(ret)
		});	
	});

});

router.get("/settlement", function(req, res, next){
	if(req.query.gold == undefined) return res.json({ ret : -1, ret_msg:"缺少参数gold!"})
	if(req.query.win == undefined) return res.json({ ret : -1, ret_msg:"缺少参数win!"})
	if(req.query.token == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数token"})

	g_App.gamecomRedis.call("hget", "third_authorization_token_val", req.query.token, function(err, ret){
		if(err) return console.log(err);
		if(ret == null) return res.json({ ret_code : -1, ret_msg : "token不合法"})
		let jret = JSON.parse(ret)
		g_App.ThirdSystem.push_cmd_to_player(jret.sid, "settlement",{
			pid : Number(jret.pid),
			gold : req.query.gold,
			win : req.query.win,
		}, function(err, ret){
			if(err) return console.log(err);
			res.json(ret)
		});
	});
});


module.exports = router;