const express = require('express')
let router = express.Router();

router.get("/c2s_get_exchange_logs", function(req, res, next){ 
	let pid = req.query.pid

	g_App.gameToyRedis.call("LRANGE", "exchange_goods_log_" + pid, 0, -1, function(err, ret){
		if(err) return console.log(err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_self_toys", function(req, res, next){
	let pid = req.query.pid

	g_App.gameToyRedis.evalsha("gy_get_self_toys", 0, pid, g_configs.extract_poundage, function(err, ret){
		if(err) return console.log(err);

		res.send(ret)
	});
});

router.get("/c2s_get_fetch_log", function(req, res, next){
	let pid = req.query.pid	

	g_App.gameToyRedis.evalsha("gy_get_fetch_log", 0, pid, function(err, ret){
		if(err) return console.log(err);
		
		res.send(ret)
	});
});

router.post("/c2s_get_fetch_detail", function(req, res, next){
	let pid = req.body.pid
	let orderids = req.body.orderids

	g_App.gameToyRedis.evalsha("gy_get_fetch_detail", 0, pid, orderids, function(err, ret){
		if(err) return console.log(err);
		res.send(ret)
	});
});


router.get("/c2s_get_self_invite_code", function(req, res, next){
	let pid = req.query.pid

	g_App.gameToyRedis.evalsha("gy_get_self_invite_code", 0, pid, g_App.get_ts(), function(err, ret){
		if(err) return console.log(err);
		res.send(ret);
	});
});

router.get("/c2s_get_input_invite_code", function(req, res, next){
	let pid = req.query.pid	
	g_App.gameToyRedis.evalsha("gy_get_input_invite_code", 0, pid, function(err, ret){
		if(err) return console.log(err);
		
		res.send(ret);
	});
});

router.get("/c2s_get_toys_gold", function(req, res, next){
	let pid = req.query.pid

	g_App.gameToyRedis.evalsha("gy_get_toys_gold", 0, pid, function(err, ret){
		if(err) {
			res.json({})
			return console.log(err);
		}

		res.send(ret)
	});
});

router.get("/c2s_get_catch_log", function(req, res, next){
	let pid = req.query.pid
	g_App.gameToyRedis.call("LRANGE", "catch_log_" + pid, 0, -1, function(err, ret){
		if(err) return console.log(err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_invite_detail", function(req, res, next){
	let pid = req.query.pid
	g_App.gameToyRedis.evalsha("gy_get_invite_detail", 0, pid, function(err, ret){
		if(err) return console.log(err);
		
		res.send(ret)
	});
});

router.get("/c2s_get_indiana_detail", function(req, res, next){
	let pid = req.query.pid
	let indiana_id = req.query.indiana_id
	let now = new Date()
	let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

	g_App.gamecomRedis.evalsha("ga_get_indiana_detail", 0, pid, indiana_id,
	 	now.toLocaleDateString(), today_ts, function(err, ret){
	 	if(err) return console.log(err);
	 	
	 	res.send(ret)
	});
});

router.post("/c2s_get_toy_invitingact", function(req, res, next){
	let pid = req.body.pid
	let toy_id = req.body.toy_id
	let act_id = req.body.act_id
	let nick_name = req.body.nick_name

	if(toy_id == undefined || act_id == undefined || nick_name == undefined) return;
	g_App.gamecomRedis.evalsha("dp_try_get_toy_invitingact", 0, pid, toy_id, act_id, function(err, ret){
		if(err) return console.log(err);
 
		if (ret == -1) {
			res.json({ret_code : -1,ret_msg : '配置错误'})
		} else if (ret == -2){
			res.json({ret_code : -2,ret_msg : '未达到要求还不能领取'})
		} else {
			g_App.gameToyRedis.evalsha("gy_get_toy_invitingact", 0, pid, toy_id, act_id, ret, g_App.get_ts(), new Date().toLocaleString(), nick_name,  function(err, ret){
				if(err) return console.log(err);


				if (ret == 0){
					g_App.gamecomRedis.evalsha("dp_change_toy_invitingact_status", 0, pid, act_id, function(err, ret){
						if(err) return console.log(err);
						if (ret == 2) {
							res.json({ret_code : 0,ret_msg : '领取成功'})
						}
					})
				} else {
					res.json({ret_code : -3,ret_msg : '领取失败'})
				}
			});
		}
	});
});


router.get("/c2s_get_pay_hoodle", function(req, res, next){
	let plat_id = req.query.plat_id	

	g_App.gamecomRedis.evalsha("dp_get_pay_hoodle", 0, plat_id, function(err, ret){
		if(err) return console.log(err);
            
		res.send(ret);
	});
});


module.exports = router;