const express = require('express')
let router = express.Router();

router.get("/c2s_get_reversalact_info", function(req, res, next){
	let pid = req.query.pid
	if(pid == undefined)  return;

	g_App.gamecomRedis.call("hvals", "cfg_reversalact", function(err,ret){
		if(err) return console.log(err);
		let room = []
		let describe = ""
		for (var key in ret){
			if(JSON.parse(ret[key]).id == 0){
				describe = JSON.parse(ret[key]).cost
			} else{
				room.push(JSON.parse(ret[key]))
			}
		}
		room.sort(function(a,b){
			return a.id - b.id
		})
		res.send({ret_code: 0, data: {describe: describe, roominfo: room }, ret_msg: ""})
	})

	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_enter_reversal_act_log",
		model : "add_date_cnt",
		values : {
			pid : pid,
			cnt : 1
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});

});

router.get("/c2s_get_reversalact_room", function(req, res, next){
	let pid = req.query.pid
	let gear = req.query.gear
	if(pid == undefined)  return;

	g_App.gamecomRedis.call("hget", "cfg_reversalact_gear", gear,function(err,result){
		if(err) return console.log(err);
		let i = 0
		let roominfo = []
		let ret = JSON.parse(result)
		for (var key in ret){
			let reward = ret[key]
			if (reward.gear == gear){
				delete reward.rate_1;
				delete reward.rate_2;
				delete reward.rate_3;
				delete reward.first_rate;
				ret[key] = reward;
				roominfo[i] = ret[key];
				i++;
			}else{
				delete ret[key]
			}
		}
		if(JSON.stringify(ret) == "{}"){
			res.send({ret_code: -1, info: "没有找到相应的配置"})
		}else{
			g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
				suffix : "month",
				table : "t_first_login_reversalact",
				model : "insert_or_ignore",
				values : {
					player_id : pid,
					toy_id : gear,
			        save_firstlogin_time : new Date().toLocaleString()
				}
			}), function(err, ret){
				if(err) return console.log(err);
			});
			g_App.gamecomRedis.call("publish", "little_game_enter_log", 
	            JSON.stringify({
	                pid : pid,
		            toy_id : gear,
		            game_type : "reversalact",
		            enter_time : new Date().toLocaleString()
	            }),function(err, ret){
	            	if(err) return console.log(err);
	           	}
	        );
			res.send({ret_code: 0, info: ret})
		}
	})
});




router.post("/c2s_get_toy_reversalact", function(req, res, next){
	let pid = req.body.pid
	let gear = req.body.gear
	let ts = g_App.get_ts();

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) return res.json({ ret_code : -1, ret_msg: '数据库错误！' });

		if (sp == null) return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });

		

		g_App.gamecomRedis.call("hget", "cfg_reversalact", gear,function(err,ret){
			if(err) return console.log(err);

			if(!ret) return res.json({ ret_code : -4, ret_msg : "没有找到配置数据"});

			let jret = JSON.parse(ret)
			let water_line = jret.water_line
			let reversal_id = jret.gear
			let reset_time = jret.reset_rate_time
			let cost = jret.cost

			if(!sp.decHoodle(cost, "翻翻乐", JSON.stringify({total_play: sp.total_play}))) return res.json({ ret_code : -6, ret_msg : "开始游戏失败，硬币不足！"});

			g_App.gamecomRedis.evalsha("db_check_littlegame_rate_by_waterline", 0, pid, reversal_id, water_line, ts, reset_time, 1, sp.total_play,function(err, ret){
				if(err) {
					return res.json({ ret_code : -5, ret_msg : "获取配置数据失败！"});
				}
				sp.total_play = sp.total_play + 1 
				let jret = JSON.parse(ret)
				let rate_name = jret.rate_name
				console.log(jret.rate_type)
				g_App.gamecomRedis.evalsha("dp_get_toy_reversalact", 0, pid, rate_name, sp.total_play, cost, gear, ts,function(err, ret){
					if(err) return console.log(err);
					if(ret == -1){
						res.json({ret_code : -1,ret_msg : '配置错误', data:{}})
					} else {
						let reward = JSON.parse(ret)
						if (reward.type == "game_redbag") {
							sp.incGame_redbag(Number(reward.content), "翻翻乐", JSON.stringify({ cfg : JSON.stringify({ name : reward.name, img : reward.image_url })}) ,true);
						}
						if (reward.type == "score") {
							sp.incScore(Number(reward.content), "翻翻乐", JSON.stringify({ name : reward.name, img : reward.image_url}), true)
						}
						if(reward.type == "gold") {
							sp.incGold(Number(reward.content), "翻翻乐", "");
						}
						if(reward.type == "toy" && reward.toycfg) {
							g_App.gameToyRedis.evalsha("gy_get_toy_reversalact", 0, pid, reward.content, reward.toycfg, g_App.get_ts(), new Date().toLocaleString(), sp.nick_name,  function(err, ret){
								if(err) return console.log(err);
							});
						}
						//res.json({ret_code :reward})
						res.json({ret_code : 0, data:{id: reward.id, name: reward.name, img: reward.image_url, type: reward.type},ret_msg : ''})
					}
				});
				
			});

		});


	})
});

module.exports = router;

