const express = require('express')
let router = express.Router();

router.get("/c2s_get_trinity", function(req, res, next){
	let pid = req.query.pid
	let trinity_id = req.query.trinity_id
	if(trinity_id == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});
	g_App.gamecomRedis.call("hget", "trinity", `${pid}_${trinity_id}`, function(err, ret){
		if(err) return console.log(err);

		g_App.gamecomRedis.call("hget","cfg_game_room_client", "trinity", function(err, dret){
			if(err) return console.log(err);
			let jret = JSON.parse(dret)
			let describe = jret[0][0].describe

			if(ret == null){
				res.json({ ret_code : 0, trinity_nums : [-1,-1,-1], describe: describe})
			}
			else{
				let jret = JSON.parse(ret)
				if(jret[2] == 0) jret = [-1,-1,-1]
				res.json({ ret_code : 0, trinity_nums : jret, describe: describe});
			}
		});
	});
});

router.post("/c2s_trinity_start", function(req, res, next){
	let pid = req.body.pid
	let trinity_id = req.body.trinity_id
	if(trinity_id == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) return res.json({ ret_code : -2, ret_msg: '数据库错误！' });

		if (sp == null) return res.json({ ret_code: -3, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });

		g_App.gamecomRedis.evalsha("dp_check_trinity_start", 0, pid, trinity_id, function(err, ret){
			if(err) return res.json({ ret_code : -4, ret_msg : "获取配置数据失败！"});
			if(ret < 0) return res.json({ ret_code : -4, ret_msg : "没有找到配置数据"});
			let gear = 0
			let water_line = 0
			let cost = 0
			let reset_time = 0
			if (ret != 0){
				let jret = JSON.parse(ret)
				if(jret.cfg != null){
					let jcfg = JSON.parse(jret.cfg)
					if(!sp.decHoodle(jcfg.cost, "三位一体", JSON.stringify({total_play: sp.total_play}))) return res.json({ ret_code : -6, ret_msg : "开始游戏失败，硬币不足！"});
					sp.total_play = sp.total_play + 1;
					gear = jcfg.gear
					water_line = jcfg.water_line
					cost = jcfg.cost
					reset_time = jcfg.reset_rate_time
				}
				if(jret.redbag != null){
					sp.incGame_redbag(jret.redbag, "三位一体");
				}
			}
			let ts = g_App.get_ts();

			g_App.gamecomRedis.evalsha("db_check_littlegame_rate_by_waterline", 0, pid, trinity_id, water_line, ts, reset_time, Number(cost) != 0 ? 1 : 0, sp.total_play,function(err, ret){
				if(err) {
					return res.json({ ret_code : -5 , ret_msg : "获取配置数据失败！"});
				}
				let jret = JSON.parse(ret)
				let rate_name = jret.rate_name
				console.log(jret.rate_type)
				g_App.gamecomRedis.evalsha("dp_trinity_start", 0, pid, trinity_id, ts, gear, rate_name.toString(), cost, sp.hoodle, sp.total_play, function(err, ret){
					if(err) {
						return res.json({ ret_code : -4, ret_msg : "获取配置数据失败！"});
					}
					res.send(ret);				
				});
			});
		});
	});


});

router.post("/c2s_trinity_end", function(req, res, next){
	let pid = req.body.pid
	let playId = req.body.playId
	let succ = req.body.succ

	if(playId == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});
	if(succ == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) return res.json({ ret_code : -2, ret_msg: '数据库错误！' });

		if (sp == null) return res.json({ ret_code: -3, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });

		g_App.gamecomRedis.evalsha("dp_trinity_end", 0, pid, playId, succ, g_App.get_ts(), sp.total_play, function(err, ret){
			if(err) return res.json({ ret_code : -4, ret_msg:"数据库错误！！"})

			if (ret < 0) return res.json({ ret_code : -5, ret_msg : "无效的参数"});

			let jret = JSON.parse(ret)
			if(jret.redbag != null){
				sp.incGame_redbag(jret.redbag, "三位一体");
			}
		
			res.send(ret)
		});
	});


});

module.exports = router;