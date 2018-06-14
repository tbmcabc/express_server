//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.get("/c2s_help_paid", function(req, res, next){
	let pid = req.query.pid

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){	
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}

		g_App.PaidAPI.genPaidUrl(pid, sp.head_img, sp.nick_name, sp.plat_id, function(err, ret){
			if(err) return res.json({ret_code : 1, ret_msg : "sdk server is error" });
			
			res.json({ ret_code : 0, share_url : ret})
		});
	});
});

router.post("/c2s_toy_exchange_rebbag", function(req, res, next){
	let redbag = req.body.redbag
	let pid = req.body.pid

	if(redbag == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"})

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}

		g_App.gamecomRedis.call("hget", "cfg_toy_redbag", redbag, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg:"db error"});
			if(ret == null ) return res.json({ ret_code : -1, ret_msg:"找不到相关配置"});
			g_App.gameToyRedis.evalsha("gy_check_toy_redbag", 0, pid, ret, new Date().toLocaleString(),  function(err, ret){
				if(err) { 
					console.log("gy_check_toy_redbag", pid, ret, err)
					g_App.log_redis_error.error(`gy_check_toy_redbag:${pid}:${ret}:${err}`)
					return res.json({ ret_code : -1, ret_msg:"数据库错误，请稍后再试"});
				}

				if( ret == -1) return res.json({ ret_code : -2, ret_msg : "检查配置，兑换失败" })
				if (ret == -2) return res.json({ ret_code : -3, ret_msg : "您的娃娃不足，不能兑换" })

				let jret = JSON.parse(ret)

				sp.incRedbag(Number(jret.redbag) * 100, "练成红包", ret)

				res.json({ ret_code : 0})
			});
		});
	});
});

let get_redbag_ticket = {}

router.post("/c2s_get_redbag", function(req, res, next){
	let pid = req.body.pid
	let redbag = Number(req.body.redbag)

	if(redbag == undefined || isNaN(redbag) == true)  return res.json({ ret_code : -1000, ret_msg : "params is lack"})

	let ts = g_App.get_ts();
	if(get_redbag_ticket[pid] != null && get_redbag_ticket[pid] >= ts + 5){	
		return res.json({ ret_code : -1000, ret_msg : "请求太频繁"});
	}
	get_redbag_ticket[pid] = ts;

	redbag = redbag * 100
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}

		if (sp.redbag < redbag) {
			return res.json({ ret_code : -2, ret_msg : "您的红包余额不足"})
		}

		g_App.ZgcAPI.send_redbag(pid, Number(redbag), function(err, ret){
			if(err){ 
				console.log("c2s_get_redbag", err)
				g_App.log_access_error.error(`c2s_get_redbag:${pid}:${redbag}:${err}`)
				return res.json({ ret_code : -1, ret_msg : "红包发送失败" + err});
			}

			if(ret == null){
				return res.json({ ret_code : -1, ret_msg : "服务器繁忙，请稍后再试"});
			}

			if(sp.decRedbag(Number(redbag), "领取红包", JSON.stringify({url : ret})) == false) {
				return res.json({ ret_code : -3, ret_msg : "您的红包余额不足"})		
			}

			g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
				suffix : "month",
				table : "t_receive_wxredbag_log",
				model : "insert",
				values : {
					pid : pid,
					wx_redbag : redbag,
		            yyl_url : ret,
		            receive_time : new Date().toLocaleString()
				}
			}), function(err, ret){
				if(err) return console.log(err);
			});

			res.json({ ret_code : 0, ret_url : ret})
		});
	});
});

router.post("/c2s_get_game_redbag", function(req, res, next){
	let pid = req.body.pid
	let redbag_id = Number(req.body.redbag_id)
	let redbag = Number(req.body.redbag)

	if(redbag_id == undefined || isNaN(redbag_id) == true)  return res.json({ ret_code : -1000, ret_msg : "params is lack"})
	if(redbag == undefined || isNaN(redbag) == true)  return res.json({ ret_code : -1000, ret_msg : "params is lack"})

	let ts = g_App.get_ts();
	if(get_redbag_ticket[pid] != null && get_redbag_ticket[pid] >= ts + 5){	
		return res.json({ ret_code : -1000, ret_msg : "请求太频繁"});
	}
	get_redbag_ticket[pid] = ts;

	redbag = redbag * 100
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}

		g_App.gamecomRedis.evalsha("gy_check_toy_game_redbag", 0, pid, redbag_id, function(err, ret){
			if(err) { 
				console.log("gy_check_toy_game_redbag", pid, ret, err)
				g_App.log_redis_error.error(`gy_check_toy_game_redbag:${pid}:${ret}:${err}`)
				return res.json({ ret_code : -1, ret_msg:"数据库错误，请稍后再试"});
			}

			if( ret == -1) return res.json({ ret_code : -2, ret_msg : "检查配置，兑换失败" })
			if (ret == -2) return res.json({ ret_code : -3, ret_msg : "非VIP用户只有1元的游戏红包提取额度，VIP用户没有限制。只需充值一次硬币立即成为VIP。" })
			if( ret == -3) return res.json({ ret_code : -4, ret_msg : "非VIP用户只有1元的游戏红包提取额度，VIP用户没有限制。只需充值一次硬币立即成为VIP。" })
			if (ret == -4) return res.json({ ret_code : -5, ret_msg : "领取次数到达上限" })

			let jret = JSON.parse(ret)

			if (sp.game_redbag < jret.amount * 100) {
				return res.json({ ret_code : -6, ret_msg : "您的红包余额不足"})
			}
	
			g_App.ZgcAPI.send_redbag(pid, Number(redbag), function(err, ret){
				if(err){ 

					g_App.log_access_error.error(`c2s_get_game_redbag:${pid}:${redbag}:${err}`)
					return res.json({ ret_code : -1, ret_msg : "游戏红包发送失败" + err});
				}
	
				if(ret == null){
					return res.json({ ret_code : -1, ret_msg : "服务器繁忙，请稍后再试"});
				}
	
				if(sp.decGame_redbag(Number(redbag), "领取游戏红包", JSON.stringify({url : ret})) == false) {
					return res.json({ ret_code : -3, ret_msg : "您的红包余额不足"})		
				}

				g_App.gamecomRedis.call("HINCRBY", "game_redbag_record", `${pid}_${redbag_id}`, 1)

				g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
					suffix : "month",
					table : "t_receive_game_wxredbag_log",
					model : "insert",
					values : {
						pid : pid,
						wx_game_redbag : redbag,
						yyl_url : ret,
						receive_time : new Date().toLocaleString()
					}
				}), function(err, ret){
					if(err) return console.log(err);
				});
	
				res.json({ ret_code : 0, ret_url : ret})
			});
		});

	});
});

module.exports = router;