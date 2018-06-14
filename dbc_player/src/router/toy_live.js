//娃娃房间抓逻辑
const express = require('express')
let router = express.Router();

//进入房间接口
router.get("/c2s_enterRoom", function(req, res, next){
	let pid = req.query.pid
	let rid = req.query.rid
	let toy_id = req.query.toy_id
	if (toy_id == undefined) toy_id = "";

	if(rid == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"})

	g_App.gamecomRedis.call("hget", "cfg_toy_room_live", rid, function(err, live_id){
		if(err) return res.json({ ret_code : -1, ret_msg:"db error"});
		if(live_id == null) live_id = rid;

		g_App.gameToyRedis.evalsha("gy_enter_toy_room", 0, pid, live_id, toy_id, new Date().toLocaleString(), function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg:"db error"});
			res.json({ ret_code : 0, room_data : ret})
		});
	});
});

//开始排队接口，调用腾讯云提供的接口
router.post("/c2s_startQueue", function(req, res, next){
	let pid = req.body.pid
	let rid = req.body.rid
	if(rid == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"})
	//看玩家是否在线
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}
		//首先检查玩家的卡是否足够
		g_App.gamecomRedis.call("hget", "cfg_toy_room", rid, function(err, ret){
			if(err)  return res.json({ ret_code : -1, ret_msg : "db service error!!"});

			if(ret == null) return res.json({ ret_code : -2, ret_msg :`cfg_toy_room ${rid} is null`});
		
			let jret = JSON.parse(ret)
			if(jret.price == null) return res.json({ ret_code : -3, ret_msg :`${rid} price is null`});
			if(sp.gold < Number(jret.price)) return res.json({ret_code : 2, ret_msg : "预约失败，您的金币不足"});

			//娃娃身上标记的特殊判断
			g_App.gamecomRedis.call("hget", "cfg_toy", jret.toy_id, function(err, toy_ret) {
				if (err) return res.json({ ret_code : -3, ret_msg: '数据库错误！' });

				if (toy_ret == null) return res.json({ ret_code : -4, ret_msg: '配置读取失败！' });

				let jtoy_ret = JSON.parse(toy_ret)				
				if( Number(jtoy_ret.charge_limit) > 0 && sp.total_charge < Number(jtoy_ret.charge_limit) ){
					return res.json({ret_code : 2, ret_msg : `预约失败，您的充值金额不足${jtoy_ret.charge_limit},请去非限定场玩`});
				}

				//去gameToyRedis去排队
				let playId = `${pid}_${rid}_${g_App.get_ts()}`
				g_App.gameToyRedis.evalsha("gy_start_toy_queue", 0, pid, jret.live_id, playId, function(err, ret){
					if(err) return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
					
					if(ret != 0) return res.json({ret_code:-4, ret_msg : `预约失败,错误码${ret}`});

					//调用腾讯云的排队逻辑接口
					g_App.ToyAPI.joinToRoom(pid+"", Number(jret.live_id), function(err, ret){
						if(err) { 
							g_App.log_live_error.error(`c2s_startQueue->joinToRoom,${pid}:${rid}:${err}`)
							console.log("joinToRoom", err)
							return res.json({ ret_code : -5, ret_msg : "预约失败，TX请求超时"});
						}
						
						let jret = JSON.parse(ret)
						if(jret.ErrorCode == 0){
							res.json({
								ret_code : 0,
								playId :playId,
								WsUrl : jret.WsUrl
							});
						}
						else{
							g_App.log_live_error.error(`joinToRoom:${pid}:${jret.live_id}:${ret}`)
							console.log("joinToRoom", ret);
							return res.json({ ret_code : -6, ret_msg : `预约失败,TX${ret}`});
						}
					});
				});
			});
		});
	});
});

//退出排队接口
router.post("/c2s_exitQueue", function(req, res, next){
	let pid = req.body.pid
	g_App.gameToyRedis.evalsha("gy_exit_toy_queue", 0, pid, function(err, ret){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});
		return res.json({ ret_code : 0});
	});
});


//开始游戏接口，扣除玩家卡, 把玩家的playId设置为有效
router.post("/c2s_startGame", function(req, res, next){
	let pid = req.body.pid
	let rid = req.body.rid
	let record_id = req.body.record_id
	if (record_id == undefined) record_id = "";

	if(rid == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"})

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) { 
			return res.json({ ret_code : -1, ret_msg : "db service error!"});
		}
		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });
		
		g_App.gamecomRedis.evalsha("gy_get_room_and_toy_cfg", 0, rid, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg : "db service error!!"});

			if(ret == null) return res.json({ ret_code : -2, ret_msg :`cfg_toy_room ${rid} is null`});
			
			let jret = JSON.parse(ret)
			if(jret.price == null) return res.json({ ret_code : -3, ret_msg :`${rid}s price is null`});
			
			let jtoy_cfg = JSON.parse(jret.toy_cfg)
			
			let prob = sp.get_catch_prob(jtoy_cfg)
			g_App.ToyAPI.set_prob(Number(jret.live_id), 
				prob.numerator, 
				prob.denominator,
			function(err, toy_ret){
				if(err){
					console.log("c2s_startGame", ret, err)
					g_App.log_live_error.error(`c2s_startGame:${ret}:${err}`)
					return res.json({ ret_code : -1, ret_msg : "开始游戏失败，机器故障"});	
				} 

				if(toy_ret.ActionStatus != "OK") {
					console.log("c2s_startGame", ret, toy_ret)
					g_App.log_live_error.error(`c2s_startGame:${ret}:${JSON.stringify(toy_ret)}`)
					return res.json({ ret_code : -1, ret_msg : "开始游戏失败，机器故障!"});
				}
				let catch_type = sp.gold_pay > 0 ? 2 : 1;
				if(sp.decGold(Number(jret.price), "真机抓娃娃") == false){
					return res.json({ret_code : -4, ret_msg : "开始游戏失败，您的金币不足"});
				}

				sp.total_catch = sp.total_catch + 1

				//充值抓取送娃娃
				let catch_time = Math.floor((Number(jret.price) + 1) / 10)
				let message = {pid: jret.owner_toy, catch_num: catch_time, type: "live" }

				g_App.gamecomRedis.call("PUBLISH","change_invitation_catch_data", JSON.stringify(message), function(err,ret){
					if(err) return console.log(err);
				});

				//玩一把
				sp.incScore(Number(jtoy_cfg.score), "真机抓娃娃", JSON.stringify({ name : jtoy_cfg.name, img : jtoy_cfg.img}), true)

				g_App.gameToyRedis.evalsha("gy_start_toy_game", 0, pid, jret.live_id, jret.toy_id, jret.toy_cfg, sp.nick_name, sp.head_img, jret.price, new Date().toLocaleString(), catch_type, record_id, function(err, ret){
					if(err){ 
						console.log("gy_start_toy_game", err);
						g_App.log_live_error.error(`gy_start_toy_game:${pid}:${JSON.stringify(jret)}:${err}`)
						return res.json({ ret_code : -1, ret_msg : "开始游戏失败，数据库错误"});
					}
					
					if(ret != 0) return res.json({ret_code: -5, ret_msg : `开始游戏失败,错误码${ret}`});
					
					res.json({ ret_code : 0 })
				});
        
        if(jtoy_cfg.push_tag != null && jtoy_cfg.push_tag != ""){
  				//记录玩家最后抓的娃娃
  				g_App.gamecomRedis.call("hset", "xg_last_catch_toy_tag", pid, jtoy_cfg.push_tag, function(err, ret){
  					if(err) return console.log(err);
  				});
        }
				
			});
		});
	});
});

//退出房间接口
router.get("/c2s_exitRoom", function(req, res, next){
	let pid = req.query.pid
	let rid = req.query.rid

	if(rid == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"})

	g_App.gamecomRedis.call("hget", "cfg_toy_room_live", rid, function(err, live_id){
		if(err) return res.json({ ret_code : -1, ret_msg:"db error"});
		if(live_id == null) live_id = rid;
		
		g_App.gameToyRedis.evalsha("gy_exit_toy_room", 0, pid, live_id, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg:"db error"});
			res.json({ ret_code : 0, room_data : ret})
		});
	});
});


module.exports = router;