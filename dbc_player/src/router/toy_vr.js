//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.post("/c2s_startGame3D", function(req, res, next) {
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

		g_App.gamecomRedis.call("hget", "cfg_toy", rid, function(err, toy_ret) {
			if (err) return res.json({ ret_code : -3, ret_msg: '数据库错误！' });

			if (toy_ret == null) return res.json({ ret_code : -4, ret_msg: '配置读取失败！' });

			let jtoy_ret = JSON.parse(toy_ret)
			
			if( Number(jtoy_ret.charge_limit) > 0){
				if(sp.total_charge < Number(jtoy_ret.charge_limit)){
					return res.json({ret_code : 2, ret_msg : `预约失败，您的充值金额不足${jtoy_ret.charge_limit},请去非限定场玩`});
				}
			}

			g_App.gamecomRedis.call("hget", "cfg_rooms_3d", rid, function(err, vr_ret){
				if (err) return res.json({ ret_code : -3, ret_msg: '数据库错误！' });

				if (vr_ret == null) return res.json({ ret_code : -4, ret_msg: '配置读取失败！' });

				let jret = JSON.parse(vr_ret)
				if (jret.price == null || jret.price == 0 ||
					jret.numerator == null ||
					jret.denominator == null) return res.json({ ret_code : -5, ret_msg: '配置数据错误！' });


				let catch_type = sp.gold_pay > 0 ? 2 : 1;
				if (sp.decGold(Number(jret.price), "VR抓娃娃") == false) {
					return res.json({ ret_code : -6, ret_msg: '没有娃娃币了，都已经填了坑，\n可不能便宜了别人，充点钱再抓\n一爪试试看！还可以找人代付哦！' });
				}


				sp.total_catch = sp.total_catch + 1

				

				//充值抓取送娃娃
				let catch_time = Math.floor((Number(jret.price) + 1) / 10)
				let message = {pid: jret.owner_toy, catch_num: catch_time, type: "vr" }

				g_App.gamecomRedis.call("PUBLISH","change_invitation_catch_data", JSON.stringify(message), function(err,ret){
					if(err) return console.log(err);
				});

				sp.incScore(Number(jret.score), "VR抓娃娃", JSON.stringify({ name : jret.name, img : jret.img}), true)
				
				let prob = sp.get_catch_prob(jret)

				let rate = Math.random() * prob.denominator;
				let result = rate < prob.numerator ? 1 : 0;
				let force = g_configs.catch_vr_force;
				let ts = g_App.get_ts()
				let token = `${pid}_${rid}_${ts}`
				g_App.gameToyRedis.evalsha("gy_start_game_3d", 0, pid, rid, token, force, result, ts, toy_ret, sp.nick_name, jret.price, way, new Date().toLocaleString(), sp.head_img, catch_type, function(err, ret) {
					if (err) return res.json({ ret_code : -7, ret_msg: '数据库错误！' });
					
					res.json({ ret_code: 0, token: token, gold: sp.gold, force: force, result: result })
				});
			});
		});
	});
});

router.post("/c2s_endGame3D", function(req, res, next) {
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
		g_App.gameToyRedis.evalsha("gy_end_game_3d", 0, pid, token, succ, ts, way, new Date().toLocaleString(), function(err, ret) {
			if (err) return res.json({ ret_code : -6, ret_msg: '数据库错误！' });

			if(ret <= 0)
				res.json({ ret_code: ret })
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