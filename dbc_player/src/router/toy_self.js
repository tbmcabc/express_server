//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.post("/c2s_goodsExchangeScore", function(req, res, next){
	let pid = req.body.pid
	let playId = req.body.playId

	if(playId == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });

		g_App.gameToyRedis.evalsha("gy_goods_exchange_score", 0, 
			pid, 
			playId, 
			new Date().toLocaleString(), function(err, ret){

			if(err) return res.json({ ret_code : -1, ret_msg : "db service error!!!"});

			if(ret < 0) return res.json({ ret_code : -3, ret_msg : "not have this toy"});

			let jret = JSON.parse(ret)
			let jcfg = JSON.parse(jret.cfg)
			
			sp.incScore(Number(jcfg.exchange_score), "娃娃兑换", JSON.stringify({ name : jcfg.name , img : jcfg.img }));

			res.json({ ret_code : 0 })

			g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
				suffix : "month",
				table : "t_toy_exchange_score_log",
				model : "insert",
				values : {
					pid : pid,
					playId : playId,
					toy_id : Number(jcfg.toy_id),
		            score : Number(jcfg.exchange_score),
		            exchange_time : new Date().toLocaleString(),
		            remain : sp.score,
		            ext : ret
				}
			}), function(err, ret){
				if(err) return console.log(err);
			});
		});

	});
});

router.get("/c2s_get_address", function(req, res, next){
	let pid = req.query.pid

	g_App.playerRedis.call("hgetall", "shipping_address_" + pid, function(err, ret){
		if(err) return console.log(err);
		let jret = {
			address : []
		}
		if(ret != null){
			jret.default = ret["default"]
			if (jret.default == null) jret.default = "address_1";
			for(let idx in ret){
				if(idx != "cnt" && idx != "default") jret.address.push({ key : idx, address : ret[idx] })
			}
		}
		else{
			jret.default = "address_1"
		}
		res.json(jret)
	});
});

router.post("/c2s_add_address", function(req, res, next){
	let pid = req.body.pid
	let address = req.body.address//g_App.base64.decode(
	if (address == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"});
	g_App.playerRedis.evalsha("dp_add_address", 0, pid, address, function(err, ret){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		res.send(ret)
	});
});

router.post("/c2s_set_default_address", function(req, res, next){
	let pid = req.body.pid
	let key = req.body.key
	if (key == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"});
	g_App.playerRedis.evalsha("dp_set_default_address", 0, pid, key, function(err, ret){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		res.send(ret)
	});
});

router.post("/c2s_modify_address", function(req, res, next){
	let pid = req.body.pid
	let key = req.body.key
	let address = req.body.address//g_App.base64.decode()
	if (key == undefined || address == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"});

	g_App.playerRedis.evalsha("dp_modify_address", 0, pid, key, address, function(err, ret){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		res.send(ret)
	});
});

//提取娃娃接口
router.post("/c2s_extract_toys", function(req, res, next){
	let pid = req.body.pid
	let toys = req.body.toys
	let receiverName = req.body.receiverName
	let receiverPhone = req.body.receiverPhone
	let receiverProvince = req.body.receiverProvince
	let receiverCity = req.body.receiverCity
	let receiverArea = req.body.receiverArea
	let receiverAddress = req.body.receiverAddress
	if(receiverName == undefined) return res.json({ ret_code : -3, ret_msg : "收货人不能为空"});
	if(receiverPhone == undefined) return res.json({ ret_code : -3, ret_msg : "收货人手机号不能为空"});
	if(receiverProvince == undefined || receiverCity == undefined 
		|| receiverArea == null || receiverAddress == null) 
		return res.json({ ret_code : -3, ret_msg : "收货地址信息不全"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });

		let jtoys = JSON.parse(toys)
		if(jtoys.length == 1){
			if(sp.decGold(g_configs.extract_poundage, "提取娃娃", toys) == false){
				return res.json({ret_code: -3, ret_msg : "您的娃娃币不足，不能提取" });
			}
		}

		g_App.gameToyRedis.evalsha("gy_extract_toys", 0, pid,
			toys, 
			sp.plat_id, 
			g_App.get_ts(),
			receiverPhone,
			receiverName,
			receiverProvince,
			receiverCity,
			receiverArea,
			receiverAddress,
			new Date().toLocaleString(),
			function(err, ret){
			if(err) {
				console.log("gy_extract_toys", err)
				g_App.log_fetch_error.error(`gy_extract_toys:${pid}:${toys}:${err}`)
				return res.json({ ret_code : -1, ret_msg : "db service error!"});
			}
			if(ret < 0) { 
				g_App.log_fetch_error.error(`gy_extract_toys_back:${pid}:${toys}:${ret}`)
				return res.json({ ret_code : -2, ret_msg : "提取娃娃错误，包含不存的娃娃"});
			}
			return res.json({ ret_code : 0});
		});
	});

});

router.post("/c2s_get_first_hoodle", function(req, res, next){
	let pid = req.body.pid

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });

		g_App.playerRedis.evalsha("dp_check_first_hoodle", 0, pid, g_configs.init_config.hoodle, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

			if(ret == 1){
				sp.incHoodle(20, "新用户赠送")
				return res.json({ ret_code : 0, data:{num: g_configs.init_config.hoodle}, ret_msg : `赠送${g_configs.init_config.hoodle}硬币`});
			}else{
				return res.json({ ret_code : -1, data:{}, ret_msg : "已经赠送过了"});
			}
			
		});
	});
});

module.exports = router;