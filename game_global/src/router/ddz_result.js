const express = require('express')
let router = express.Router();

router.post("/ddz_notify_result", function(req, res, next){
	let sign = req.body.sign;
	let op = req.body.op;
	let count = req.body.count;
	let way = req.body.way;
	let play_id = req.body.play_id;
	console.log(op)
	console.log(count)
	if(sign == undefined || op == undefined || count == undefined) {
		return res.json({ret_code: -3, ret_msg:"缺少参数"})
	}
	if(way == undefined){way = "ddz"}
	
	g_App.gamecomRedis.call("hget", "player_ddz_sign", sign, function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}		
		if(!ret){
			console.log("缺少玩家数据")
			return res.json({ ret_code : -2, ret_msg : "缺少玩家数据"})
		}		
		let jret = JSON.parse(ret)
		// if(op == "add_game_redbag"){
		// 	g_App.gamecomRedis.call("hset", "ddz_pid_map", jret.pid+"_status", 0)
		// }
		g_App.gamecomRedis.call("hset", "ddz_pid_map", jret.pid+"_status", 0)
        g_App.ThirdSystem.push_cmd_to_player(jret.dbid, "ddz_game_result", {
			pid : Number(jret.pid),op: op, count: count, way: way, play_id: play_id.toString()
		}, function(err, ret){
			if(err) return console.log(err);
			console.log(ret)
			res.json(ret)
		});
	});
});

router.post("/ddz_notify_check_player_info", function(req, res, next){
	let sign = req.body.sign
	if(sign == undefined) return res.json({ret_code: -3, ret_msg:"缺少参数"})


	g_App.gamecomRedis.call("hget", "player_ddz_sign", sign, function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}		
		if(!ret){
			return res.json({ ret_code : -2, ret_msg : "缺少玩家数据"})
		}	
		let jret = JSON.parse(ret)

		g_App.ThirdSystem.push_cmd_to_player(jret.dbid, "get_user_hoodle", {
			pid : Number(jret.pid)
		}, function(err, ret){
			if(err) return console.log(err);
			res.json(ret)
		});
	});

	
})

router.post("/ddz_notify_login", function(req, res, next){
	let sign = req.body.sign
	if(sign == undefined) return res.json({ret_code: -3, ret_msg:"缺少参数"})
	console.log(sign)
	g_App.gamecomRedis.call("hget", "player_ddz_sign", sign, function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}		
		if(!ret){
			return res.json({ ret_code : -2, ret_msg : "缺少玩家数据"})
		}	
		let jret = JSON.parse(ret)
		res.json({ ret_code : 0, player_data: jret})
		
	});
});

router.post("/ddz_notify_binding", function(req, res, next){
	let sign = req.body.sign
	let ddz_pid = req.body.ddz_pid

	if(sign == undefined || ddz_pid == undefined){
		return res.json({ ret_code : -4, ret_msg : "缺少参数"})
	}
	
	g_App.gamecomRedis.call("hget", "player_ddz_sign", sign, function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}		
		if(!ret){
			return res.json({ ret_code : -2, ret_msg : "缺少玩家数据"})
		}	
		let jret = JSON.parse(ret)
		g_App.gamecomRedis.call("hget", "ddz_pid_map", jret.pid, function(err, ret){
			if(err) return console.log(err)
			if(ret){
				if(ddz_pid != ret){
					res.json({ ret_code : -3, ret_msg : "绑定失败"})
				}else{
					res.json({ ret_code : 0, ret_msg : "welcome oldplayer!"})
				}
				
			}else{
				g_App.gamecomRedis.call("hset", "ddz_pid_map", jret.pid, ddz_pid)
				res.json({ ret_code : 0, ret_msg : "welcome newplayer!"})
			}
		})
	});
});

router.post("/ddz_notify_start", function(req, res, next){
	let sign = req.body.sign
	if(sign == undefined){
		return res.json({ ret_code : -4, ret_msg : "缺少参数"})
	}
	let now_ts = g_App.get_ts()
	
	g_App.gamecomRedis.call("hget", "player_ddz_sign", sign, function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}		
		if(!ret){
			console.log("缺少玩家数据");
			return res.json({ ret_code : -2, ret_msg : "缺少玩家数据"})
		}	
		let jret = JSON.parse(ret)
		let key = jret.pid+"_status"

		g_App.gamecomRedis.call("hget", "ddz_pid_map", key, function(err, ret){
			if(err) {
				console.log(err)
				return res.json({ ret_code : -3 , ret_msg : "status err!"})
			}
			if(ret){
				if(ret == "0" || now_ts - ret.toString() <= 600){
					g_App.gamecomRedis.call("hset", "ddz_pid_map", jret.pid+"_status", now_ts)
					g_App.ThirdSystem.push_cmd_to_player(jret.dbid, "get_user_hoodle", {
						pid : Number(jret.pid)
					}, function(err, ret){
						if(err) return console.log(err);
						console.log(ret)
						res.json(ret)
					});
				}else{
					console.log("status err!");
					g_App.gamecomRedis.call("hset", "ddz_pid_map", jret.pid+"_status", 0)
					return res.json({ ret_code : -4 , ret_msg : "status err!"})
				}
				
			}else{
				g_App.gamecomRedis.call("hset", "ddz_pid_map", jret.pid+"_status", now_ts)
				g_App.ThirdSystem.push_cmd_to_player(jret.dbid, "get_user_hoodle", {
					pid : Number(jret.pid)
				}, function(err, ret){
					if(err) return console.log(err);
					console.log(ret)
					res.json(ret)
				});
			}

			g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
				suffix : "month",
				table : "t_start_ddz_log",
				model : "insert",
				values : {
					pid : jret.pid,
				}
			}), function(err, ret){
				if(err) return console.log(err);
			});


		})
	});
});


module.exports = router;