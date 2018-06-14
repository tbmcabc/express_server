const express = require('express')
let router = express.Router();


router.post("/c2s_login", function(req, res, next){
	let pid = req.body.pid
	let dbid = req.body.dbid
	let params = JSON.parse(g_App.base64.decode(req.body.params))
	
	//如果在房间里面返回给客户端进入房间的信息
	g_App.playerManager.createNewPlayer(pid, dbid, params, function(err, sp, old){
		if(err){ 
			g_App.log_access_error.error(`${pid}:${dbid}:${req.body.params}:${err}`)
			return res.json({ ret_code : -1, ret_msg : "get player data error"});
		}

		sp.dbid = dbid
		sp.head_img = params.head_img
		sp.nick_name = params.nick_name

		sp.on_player_login()

		g_App.playerRedis.evalsha("dp_get_login_data", 0, pid, function(err, ret){
			if(err) return console.log(err);
			res.json({
				ret_code : 0,
				data : sp.data,
				live_sig : g_App.TLS.genSig(pid),
				ext_data : ret,
				old : old
			})
		});

		g_App.gameH5Redis.evalsha("gy_h5_sd_back", 0, pid, function(err, ret) {});

		let ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
		if (ip.substr(0, 7) == "::ffff:") {
		  	ip = ip.substr(7)
		}
		let idfa = params.idfa != null ? idfa : "";
		g_App.playerRedis.evalsha("on_player_login", 0, 
			params.plat_act,
			pid,
			params.plat_id,
			new Date().toLocaleString(),
			dbid,
			ip,
			idfa,
			function(err, ret){
				if(err) return console.log(err);
			});
	});
});


//积分兑换实物
router.post("/c2s_exchangeGoods", function(req, res, next){
	let pid = req.body.pid
	let goods_id = req.body.goods_id

	if(goods_id == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });

		g_App.gamecomRedis.evalsha("gy_exchange_goods", 0, goods_id, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg : "db service error!!"});
			if(ret == -1) return res.json({ ret_code : -3, ret_msg : "您所兑换的商品没有库存了！"});
			if(ret < 0) return res.json({ ret_code : -2, ret_msg : "读取配置错误"});

			let jret = JSON.parse(ret)
			if(jret.score == null) return res.json({ ret_code : -3, ret_msg :`${goods_id}'s price is null`});

			if(jret.type == "HF" && (req.body.phone == undefined || req.body.phone == "")){
				return res.json({ ret_code : -1000, ret_msg : "手机号不能为空"});
			}
			if(jret.type == "SW" && (req.body.address == undefined || req.body.address == "")){
				return res.json({ ret_code:-1000, ret_msg:"收货地址不能为空"})
			}

			if(sp.decScore(Number(jret.score), "兑换商品", JSON.stringify({ name : jret.name, img : jret.img})) == false){
				return res.json({ret_code : -4, ret_msg : "兑换失败，您的积分不足"});
			}

			if(jret.type == "SW"){
				g_App.gameToyRedis.evalsha("gy_extract_exchange_goods", 0, 
					pid, 
					sp.nick_name,
					goods_id,
					sp.plat_id,
					g_App.get_ts(),
					req.body.address,
					new Date().toLocaleString(),
					`c2s_exchangeGoods_${pid}_${g_App.get_ts()}`,
					ret,
					function(err, rt){
					if(err) {
						console.log("gy_extract_exchange_goods", err);
						g_App.log_mall_error.error(`gy_extract_exchange_goods:${pid}:${ret}:${req.body.address}:${err}`)
						return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
					}

					g_App.gameToyRedis.evalsha("gy_exchange_goods", 0, pid, goods_id, ret,
						jret.score, sp.score, 
						new Date().toLocaleString(), 
						`c2s_exchangeGoods_${pid}_${g_App.get_ts()}`,
						"您可以在我的娃娃-提取记录查看详情",
						function(err, ret){
							if(err) { 
								console.log("gy_extract_exchange_goods->gy_exchange_goods", err)
								return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
							}

							res.json({ ret_code : 0 , succ_msg:`订单提交成功\n客服一路小跑着为您邮寄商品去了，请静候佳音~\n您可在我的娃娃-提取记录里面看到订单的最新状态`} )
						});					
				});
			}
			if(jret.type == "JD"){
				g_App.gamecomRedis.evalsha("gy_exchange_jd_cards", 0, pid, jret.value, 
					new Date().toLocaleString(),
					function(err, card_pwd){
						if(err) {
							console.log("gy_exchange_jd_cards", err)
							g_App.log_mall_error.error(`gy_exchange_jd_cards:${pid}:${ret}:${err}`)
							return res.json({ ret_code : -1, ret_msg : "db service error!!"});
						}
						if(card_pwd < 0) {
							console.log("gy_exchange_jd_cards", err);
							g_App.log_mall_error.error(`gy_exchange_jd_cards:${pid}:${ret}:${card_pwd}`)
							return res.json({ ret_code : -4, ret_msg: "发放失败，请联系客服，错误码" + card_pwd})
						}

						g_App.gameToyRedis.evalsha("gy_exchange_goods", 0, pid, goods_id, ret, 
							jret.score, sp.score, 
							new Date().toLocaleString(), 
							`c2s_exchangeGoods_${pid}_${g_App.get_ts()}`, "卡密: " + card_pwd, function(err, ret){

							if(err) { 
								console.log("gy_exchange_jd_cards->gy_exchange_goods", err)
								return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
							}

							res.json({ ret_code : 0 , succ_msg:`恭喜兑换成功\n获得${jret.name}\n卡密:\n${card_pwd}\n您可在兑换记录中查看`} )
						});
				});
			}
			else if(jret.type == "QB"){
				g_App.gamecomRedis.evalsha("gy_exchange_qb_cards", 0, pid, jret.value, 
					new Date().toLocaleString(),
					function(err, card_pwd){
						if(err) {
							console.log("gy_exchange_qb_cards", err)
							g_App.log_mall_error.error(`gy_exchange_qb_cards:${pid}:${ret}:${err}`)
							return res.json({ ret_code : -1, ret_msg : "db service error!!"});
						}
						if(card_pwd < 0) {
							console.log("gy_exchange_qb_cards", err);
							g_App.log_mall_error.error(`gy_exchange_qb_cards:${pid}:${ret}:${card_pwd}`)
							return res.json({ ret_code : -4, ret_msg: "发放失败，请联系客服，错误码" + card_pwd})
						}

						g_App.gameToyRedis.evalsha("gy_exchange_goods", 0, pid, goods_id, ret, 
							jret.score, sp.score, 
							new Date().toLocaleString(), 
							`c2s_exchangeGoods_${pid}_${g_App.get_ts()}`, card_pwd, function(err, ret){

							if(err) { 
								console.log("gy_exchange_qb_cards->gy_exchange_goods", err)
								return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
							}

							res.json({ ret_code : 0 , succ_msg:`恭喜兑换成功\n获取${jret.name}\n${card_pwd}\n您可在兑换记录中查看`} )
						});
				});
			}
			else if(jret.type == "HF"){
				let phone = req.body.phone

				g_App.gamecomRedis.evalsha("gy_exchange_hf_cards", 0, pid, jret.value, phone,
					new Date().toLocaleString(),
					function(err, rs){
					if(err) {
						console.log("gy_exchange_hf_cards", err)
						g_App.log_mall_error.error(`gy_exchange_hf_cards:${pid}:${ret}:${err}`)
						return res.json({ ret_code : -1, ret_msg : "db service error!!"});
					}

					g_App.gameToyRedis.evalsha("gy_exchange_goods", 0, pid, goods_id, ret, 
							jret.score, sp.score, 
							new Date().toLocaleString(), 
							`c2s_exchangeGoods_${pid}_${g_App.get_ts()}`,  "充值手机号:" + phone, function(err, ret){
							if(err) { 
								console.log("gy_exchange_hf_cards->gy_exchange_goods", err)
								return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
							}

							res.json({ ret_code : 0 , succ_msg:`恭喜兑换成功\n获取${jret.name}\n正在为手机号为\n${phone}进行充值,\n请留意您的手机充值成功短信！`} )
					});
				});
			}
			else if(jret.type == "HB"){
				sp.incRedbag(jret.value, "积分兑换", JSON.stringify({ cfg : JSON.stringify({ name : jret.name, img : jret.img })}));

				g_App.gameToyRedis.evalsha("gy_exchange_goods", 0, pid, goods_id, ret, 
					jret.score, sp.score, 
					new Date().toLocaleString(), 
					`c2s_exchangeGoods_${pid}_${g_App.get_ts()}`, 
					"您可以在娃娃炼金界面查看", function(err, ret){

					if(err) { 
						console.log("gy_exchange_hb->gy_exchange_goods", err)
						return res.json({ ret_code : -1, ret_msg : "db service error!!!"});
					}

					res.json({ ret_code : 0 , succ_msg:`恭喜兑换成功\n获得${jret.name}\n您可在娃娃炼金界面中查看`} )
				});
			}
		});
	});
});


router.get("/c2s_get_log_gold", function(req, res, next){
	let pid = req.query.pid

	g_App.playerRedis.call("LRANGE", "log_gold_" + pid, 0, -1, function(err, ret){
		if(err) return console.log("c2s_get_log_gold", err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_log_score", function(req, res, next){
	let pid = req.query.pid	

	g_App.playerRedis.call("LRANGE", "log_score_" + pid, 0, -1, function(err, ret){
		if(err) return console.log("c2s_get_log_score", err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});


router.get("/c2s_get_log_redbag", function(req, res, next){
	let pid = req.query.pid
	let type = req.query.type
	if(type == undefined)  return res.json({ ret_code : -1000, ret_msg : "params is lack"});

	let key = type == "inc" ? `log_redbag_get_${pid}` : `log_redbag_cost_${pid}`
	g_App.playerRedis.call("LRANGE", key, 0, -1, function(err, ret){
		if(err) return console.log("c2s_get_log_redbag", err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_log_hoodle", function(req, res, next){
	let pid = req.query.pid	

	g_App.playerRedis.call("LRANGE", "log_hoodle_" + pid, 0, -1, function(err, ret){
		if(err) return console.log("c2s_get_log_hoodle", err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_log_game_redbag", function(req, res, next){
	let pid = req.query.pid	

	g_App.playerRedis.call("LRANGE", "log_game_redbag_" + pid, 0, -1, function(err, ret){
		if(err) return console.log("c2s_get_log_game_redbag", err);
		let newLogs = []
		let logs = ret
		let pre = null;
		let i = 0
		while(i < logs.length){
			let now = JSON.parse(logs[i])
			let idx = now.way.indexOf("-")
			if(idx > 0){
				now.game_redbag = Number(now.game_redbag)
				if(pre == null) pre = now;
				else if(now.way == pre.way){
					pre.game_redbag+=now.game_redbag;
				}
				else{
					pre.way = pre.way.substring(0, idx)
					newLogs.push(JSON.stringify(pre))
					pre = now;
				}
			}
			else{
				if(pre != null){
					pre.way = pre.way.substring(0, pre.way.indexOf("-"));
					newLogs.push(JSON.stringify(pre))
					pre = null
				}
				newLogs.push(JSON.stringify(now))
			}
			i++;
		}
		if(pre != null){
			pre.way = pre.way.substring(0, pre.way.indexOf("-"));
			newLogs.push(JSON.stringify(pre))
		}

		let jret = {
			logs : newLogs
		}
		res.json(jret);
	});
});

router.post("/c2s_h5_start_queue", function(req, res, next){
	let pid = req.body.pid
	let rid = req.body.rid
	let queuenum = req.body.queuenum	

	if (pid == undefined) return res.json({ ret_code : -1, ret_msg:"pid参数错误" } )
	if (rid == undefined) return res.json({ ret_code : -2, ret_msg:"rid参数错误" } )
	if (queuenum == undefined) return res.json({ ret_code : -3, ret_msg:"queuenum参数错误" } )

	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_h5_live_queue_log",
		model : "insert",
		values : {
			pid : pid,
			rid : rid,
			queuenum : queuenum,
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});
	res.json({ ret_code : 0 } )
});

router.get("/c2s_transtodownnload", function(req, res, next){
	res.send("{}")
	let pid = req.query.pid
	let pos = req.query.pos
	let log = {
		suffix : "month",
		table : "t_transtodownload_log",
		model : "insert",
		values : {
			pid : pid,
	        pos : pos
		}
	}
	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify(log), function(err, ret){
		if(err) return console.log(err);
	});
});



module.exports = router;