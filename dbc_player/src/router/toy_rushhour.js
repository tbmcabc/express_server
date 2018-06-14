//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.post("/c2s_rushhour_start", function(req, res, next) {
	let pid = req.body.pid
	let rushhour_id = req.body.rushhour_id
	if(rushhour_id == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) { 
			return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
		}

		if (sp == null) {
			return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });
		}
		let ts = g_App.get_ts();

		g_App.gamecomRedis.evalsha("dp_check_rushhour_start", 0, pid, rushhour_id, ts, function(err, ret){
			if(err) {
				return res.json({ ret_code : -4, ret_msg : "获取配置数据失败！"});
			}

			if(ret < 0) return res.json({ ret_code : -5, ret_msg : "没有找到配置数据"});

			let gear = 0;
			let water_line = 0;
			let cost = 0;
			let total_time = 0;
			let catch_time = 0;
			let reset_time = 0;
			if (ret != 0){
				let jret = JSON.parse(ret)
				if(jret.cfg != null){
					let jcfg = JSON.parse(jret.cfg)
					if(!sp.decHoodle(jcfg.cost, "争分夺宝", JSON.stringify({total_play: sp.total_play}))) return res.json({ ret_code : -6, ret_msg : "开始游戏失败，硬币不足！"});
					sp.total_play = sp.total_play + 1 
					gear = jcfg.gear
					water_line = jcfg.water_line
					cost = jcfg.cost
					total_time = jcfg.total_time
					catch_time = jcfg.catch_time
					reset_time = jcfg.reset_rate_time
				}
			}
			g_App.gamecomRedis.evalsha("db_check_littlegame_rate_by_waterline", 0, pid, rushhour_id, water_line, ts, reset_time, Number(cost) != 0 ? 1 : 0, sp.total_play,function(err, ret){
				if(err) {
					return res.json({ ret_code : -5, ret_msg : "获取配置数据失败！"});
				}
				let jret = JSON.parse(ret)
				let rate_name = jret.rate_name
				console.log(jret.rate_type)
				g_App.gamecomRedis.evalsha("dp_rushhour_start", 0, pid, rushhour_id, ts, gear, rate_name.toString(), cost, total_time, catch_time, sp.hoodle, sp.total_play,function(err, ret){
					if(err) {
						return res.json({ ret_code : -4, ret_msg : "获取配置数据失败！"});
					}
					if(ret == -2) return res.json({ ret_code : -7, ret_msg : "无效开始标志，游戏结束"})
					res.send(ret);				
				});			
			});
		});
	});
});

router.post("/c2s_rushhour_end", function(req, res, next) {
	let pid = req.body.pid
	let playId = req.body.playId
	let succ = req.body.succ

	if(playId == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});
	if(succ == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) return res.json({ ret_code : -2, ret_msg: '数据库错误！' });

		if (sp == null) return res.json({ ret_code: -3, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });

		g_App.gamecomRedis.evalsha("dp_rushhour_end", 0, pid, playId, succ, g_App.get_ts(), sp.total_play, function(err, ret){
			if(err) {
				return res.json({ ret_code : -4, ret_msg:"数据库错误！！"})
			}

			if(ret == -2) return res.json({ ret_code : -7, ret_msg : "无效开始标志，游戏结束"});

			if (ret < 0) return res.json({ ret_code : -5, ret_msg : "无效的参数"});

			let jret = JSON.parse(ret)

			if(jret.nowtime_redbag > 0){
				sp.incGame_redbag(jret.nowtime_redbag, `争分夺宝-${sp.total_play}`, JSON.stringify({idx : jret.idx }));
			}
			res.send(jret)
		});
	});


});


router.get("/c2s_get_rushhour_info", function(req, res, next){
	let pid = req.query.pid
	let rushhour_id = req.query.rushhour_id
	if(pid == undefined)  return;
	if(rushhour_id == undefined)  return;

	g_App.gamecomRedis.evalsha("gy_get_rushhour_info", 0, pid, rushhour_id, g_App.get_ts(), function(err, ret){
		if(err) return console.log(err);

		g_App.gamecomRedis.call("hget","cfg_game_room_client", "rushhour", function(err, dret){
			if(err) return console.log(err);
			let jdret = JSON.parse(dret)
			let describe = jdret[0][0].describe

			if(ret == 0){
				res.send({ret_code :ret, describe: describe})
			} else {
				let jret = JSON.parse(ret)
				res.send({ret_code : 1 ,redbag: jret.redbag, remain_time: jret.remain_time, describe:describe})
			}
		});
	});
});


module.exports = router;