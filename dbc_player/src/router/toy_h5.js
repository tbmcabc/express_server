//娃娃炼金功能模块
const express = require('express')
let router = express.Router();


router.get("/c2s_gen_h5_order", function(req, res, next){
	let pid = req.query.pid
	let price = req.query.price
	let productid = req.query.productid
	let ext_params = {}
	if(req.query.ext_params != undefined) ext_params = JSON.parse(g_App.base64.decode(req.query.ext_params));

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){	
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}

		g_App.PaidAPI.genOrder(price, sp.plat_id, productid, pid, ext_params, function(err, ret){
			if(err) return res.send(err);

			res.send(ret)
		});
	});

	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_click_pay_log",
		model : "add_date_cnt",
		values : {
			pid : pid,
			product_id : productid,
			cnt : 1,
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});


});

router.post("/c2s_baidu_pay_notify", function(req, res, next){
	let pid = req.body.pid
	let params = req.body.params

	g_App.PaidAPI.baiduPayNotify(params, function(err, ret){
		if(err) return res.json({ ret_code : -1, ret_msg : err})

		res.json({ ret_code : 0})
	});
});

router.post("/c2s_startGameH5", function(req, res, next) {
	let pid = req.body.pid
	let rid = req.body.rid
	let way = req.body.way
	if(way == undefined) way = "Live";
	
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) { 
			return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
		}

		if (sp == null) {
			return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });
		}
		g_App.gamecomRedis.call("hget", "cfg_toy", rid, function(err, ret) {
			if (err) return res.json({ ret_code : -3, ret_msg: '数据库错误！' });

			if (ret == null) return res.json({ ret_code : -4, ret_msg: '配置读取失败！' });
			
			let jret = JSON.parse(ret)
			if (jret.price == null || jret.price == 0) return res.json({ ret_code : -5, ret_msg: '配置数据错误！' });

			let catch_type = sp.gold_pay > 0 ? 2 : 1;
			if (sp.decGold(Number(jret.price), "简易抓娃娃") == false) {
				return res.json({ ret_code : -6, ret_msg: '没有娃娃币了，都已经填了坑，可不能便宜了别人，充点钱再抓一爪试试看！还可以找人代付哦！' });
			}

			sp.incScore(Number(jret.score), "简易抓娃娃", JSON.stringify({ name : jret.name, img : jret.img}), true)

			let prob = sp.get_catch_prob(jret)
			let rate = Math.random() * prob.denominator;
			let result = rate < prob.numerator ? 1 : 0;
			let ts = g_App.get_ts()
			let token = `${pid}_${rid}_${ts}`
			g_App.gameToyRedis.evalsha("gy_start_game_h5", 0, pid, rid, token, result, ts, ret, sp.nick_name, jret.price, way, new Date().toLocaleString(), catch_type, function(err, ret) {
				if (err) return res.json({ ret_code : -7, ret_msg: '数据库错误！' });
				
				res.json({ ret_code: 0, token: token, gold: sp.gold, result: result })
			});
		});
	});
});

router.post("/c2s_endGameH5", function(req, res, next) {
	let pid = req.body.pid
	let rid = req.body.rid
	let token = req.body.token
	let succ = req.body.succ
	let way = req.body.way
	if(way == undefined) way = "Live";

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) { 
			return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
		}

		if (sp == null) {
			return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });
		}
		
		let ts = g_App.get_ts()
		g_App.gameToyRedis.evalsha("gy_end_game_h5", 0, pid, token, succ, ts, way, new Date().toLocaleString(), function(err, ret) {
			if (err) return res.json({ ret_code : -6, ret_msg: '数据库错误！' });
			if(ret <= 0){
				res.json({ ret_code: ret })	
			}
			else{
				let jret = JSON.parse(ret)
				if(jret.auto_type != null && jret.auto_type != ""){
					g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
						pid, "auto_add", 
						JSON.stringify({ 
						  auto_type : jret.auto_type,
						  auto_val : jret.auto_val,
						  way : `抓中${jret.name}`,
						  toy : JSON.stringify({name : jret.name , img : jret.img, playId : token })
						}), 
						function(err, ret){
						if(err) return console.log(err)
					});	
				}
				res.json({ ret_code: 1 })		
			}
		});
	});
});

module.exports = router;