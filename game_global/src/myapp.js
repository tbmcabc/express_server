const NetWork = require("network")
const HDUtils = require("hd-utils")
const ThirdSystem = require("./utils/third")
const mysql = require("mysql")
const log4js = require("log4js")
log4js.configure(g_configs.log_configs)

class GameGlobalApp{
	constructor(){
		this.md_http = require("./md_http")


		this.mysqlCli = mysql.createPool(g_configs.db_config)
		this.ThirdSystem = new ThirdSystem();
		this.gamecomRedis = new NetWork.RedisCli("gamecom", g_configs.redis_configs["game_com"], "dp_gamecom_sha")
		this.subGamecomRedis = new NetWork.RedisCli("subgamecom", g_configs.redis_configs["game_com"], null)
		this.sdkLoginRedis = new NetWork.RedisCli("sdklogin", g_configs.redis_configs["sdk_login"], null)
		this.gameToyRedis = new NetWork.RedisCli("gametoy", g_configs.redis_configs["game_toy"], "dp_gametoy_sha")
		this.subGameToyRedis = new NetWork.RedisCli("subgametoy", g_configs.redis_configs["game_toy"], null)

		this.log_http_error = log4js.getLogger("httperror")
		this.log_pay = log4js.getLogger("pay")
		this.log_pay_succ = log4js.getLogger("pay_succ")
		this.log_catch = log4js.getLogger("catch")
		this.log_mall = log4js.getLogger("mall")
		this.log_mall_error = log4js.getLogger("mall_error")
		this.log_fetch = log4js.getLogger("fetch")
		this.log_fetch_error = log4js.getLogger("fetch_error")
		this.log_sys_error = log4js.getLogger("syserror")
		this.log_toy_expire_error = log4js.getLogger("toy_expire_error")
	}

	lanuch(){
		this.md_http.start()

		this.registerSubcribeEvent()

		this.subGameToyRedis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});

		
		this.subGamecomRedis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});

		this.startModifyProfitsListening()
		this.startFetchToyListening()
		this.startModifyFetchToyListening()
		this.startGetGameToyCmdListening()
		this.startCheckExpireToys()

		setInterval(this.random_luck_wall.bind(this), 10000)
	}

	startCheckExpireToys(){
		let now_ts = this.get_ts()
		let expire_ts = now_ts - 29 * 24 * 3600
		this.gameToyRedis.call("rpop", "expire_toy_list", function(err, ret){
			if(err) return console.log(err);
			if(ret != null){
				let jret = JSON.parse(ret)
				if(Number(jret.ts) < expire_ts){
					g_App.gameToyRedis.call("lpush", "expire_toy_right_now_list", ret, function(err, ret){
						if(err) return console.log(err);
						//发送信鸽推送
						g_App.startCheckExpireToys()
					});
				}
				else{
					g_App.gameToyRedis.call("rpush", "expire_toy_list", ret, function(err, rt){
						if(err) { 
							g_App.log_toy_expire_error.error(`startCheckExpireToys->rpush->expire_toy_list:${ret}`)
							return console.log("startCheckExpireToys->rpush->expire_toy_list",err);
						}
						g_App.startCheckExpireRightNowToys()
					});
				}
			}
			else
				g_App.startCheckExpireRightNowToys()
		});
		if(this.expire_toy_chk_evt != null){
			clearTimeout(this.expire_toy_chk_evt)
		}
		//每天凌晨12天检查一次
		let now = new Date()
		let next_check = 24 * 3600 * 1000 - (now.getTime() - new Date(now.toLocaleDateString()).getTime())
		this.expire_toy_chk_evt = setTimeout(this.startCheckExpireToys.bind(this), next_check)
	}

	startCheckExpireRightNowToys(){
		let now_ts = this.get_ts()
		let expire_ts = now_ts - 30 * 24 * 3600
		this.gameToyRedis.call("rpop", "expire_toy_right_now_list", function(err, ret){
			if(err) return console.log(err);
			if(ret != null){
				let jret = JSON.parse(ret)
				if(Number(jret.ts) < expire_ts){
					g_App.gameToyRedis.evalsha("gy_deal_expire_toy", 0, ret, function(err, ret_deal){
						if(err){ 
							g_App.log_toy_expire_error.error(`startCheckExpireRightNowToys->gy_deal_expire_toy:${ret}:${err}`)
							return console.log("gy_deal_expire_toy", err);
						}
						if(ret_deal == 0){
							let jtoy_cfg = JSON.parse(jret.cfg)

							g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
								jret.pid, "add_score", 
								JSON.stringify({ score : jtoy_cfg.exchange_score, way : "娃娃过期，自动兑换", toy : JSON.stringify({name : jtoy_cfg.name , img : jtoy_cfg.img, playId : jret.playId})}), 
								function(err, rt){
									if(err) { 
										g_App.log_toy_expire_error.error(`startCheckExpireRightNowToys->rpush->expire_toy_right_now_list:${ret}${err}`)
										return console.log("startCheckExpireRightNowToys->gy_add_player_cmd", err);
									}
							});
							g_App.log_toy_expire_error.info(`deal_expire_toy_succ:${ret}`)
						}
						g_App.startCheckExpireRightNowToys()
					});
				}
				else{
					g_App.gameToyRedis.call("rpush", "expire_toy_right_now_list", ret, function(err, rt){
						if(err) { 
							g_App.log_toy_expire_error.error(`startCheckExpireRightNowToys->rpush->expire_toy_right_now_list:${ret}${err}`)
							return console.log(err);
						}
					});
				}
			}
		});
	}

	random_luck_wall(){
		this.gamecomRedis.evalsha("gy_random_luck_wall", 0, this.get_ts(), function(err, ret){
			if(err) return console.log(err);
		});
	}

	registerSubcribeEvent(){
		this.subGameToyRedis.call("subscribe", "fetch_cmd_notify");
		this.subGameToyRedis.call("subscribe", "modify_fetch_cmd_notify");
		this.subGameToyRedis.call("subscribe", "modify_profits_notify");
		this.subGamecomRedis.call("subscribe", "get_game_toy_cmd_notify")
		this.subGamecomRedis.call("subscribe", "reply_third_cmd_notify")
	}

	on_reply_third_cmd_notify(msg){
		g_App.ThirdSystem.on_get_third_cmd(msg)
	}

	on_modify_profits_notify(){
		this.startModifyProfitsListening()
	}

	on_fetch_cmd_notify(){
		this.startFetchToyListening()
	}

	on_modify_fetch_cmd_notify(){
		this.startModifyFetchToyListening()
	}

	on_get_game_toy_cmd_notify(){
		this.startGetGameToyCmdListening()
	}

	onRecvSubscribeEvent(channel, message){
		let key = "on_" + channel
		let func = this[key]
		if(func != null) func.call(this, message);
	}

	startModifyProfitsListening(){
		this.gameToyRedis.call("lpop", "modify_profits_cmd_list", function(err, ret){
			if(err) return console.log(err);
			if(ret != null){
			    let jret = JSON.parse(ret)
			    if(jret.type == "catch_toy"){
			    	let jtoy_cfg = JSON.parse(jret.cfg)
					if(jtoy_cfg.value != undefined && jtoy_cfg.value != null){
						g_App.gamecomRedis.call("hincrby", "game_server_control", "profits", -Number(jtoy_cfg.value), function(err, ret){
				            if(err) return console.log(err);          
				        });
					}
			    }

				g_App.startModifyProfitsListening();
			}
		});
	}

	startFetchToyListening(){
		this.gameToyRedis.call("lpop", "fetch_cmd_list", function(err, ret){
			if(err) return console.log(err);
			if(ret != null){
				g_App.log_fetch.info(ret)
				let jret = JSON.parse(ret)
				let columns = []
				let values  = []
				let placeholder = []
				for(let key in jret){
					columns.push(key)
					values.push(jret[key])
					placeholder.push("?")
				}
				columns.push("save_time")
				placeholder.push("now()")

				let str_sql = `insert into t_sku_order(${columns.join(",")}) values(${placeholder.join(",")})`
				g_App.mysqlCli.query(str_sql, values, function(err, rt){
					if(err == null) return;
					console.log(str_sql, ret, err)
					g_App.log_fetch_error.error(`${str_sql}:${ret}:${err}`)
					g_App.gameToyRedis.call("lpush", "fetch_toy_cmd_error", ret, function(err, ret){
						if(err) return console.log(err);
					});
				});
				g_App.startFetchToyListening();
			}
		});
	}

	startModifyFetchToyListening(){
		this.gameToyRedis.call("lpop", "modify_fetch_cmd_list", function(err, ret){
			if(err) return console.log(err);
			if(ret != null){
				g_App.log_fetch.info(ret)
				let jret = JSON.parse(ret)
				let columns = []
				let values  = []
				for(let key in jret.values){
					columns.push(`${key} = ?`)
					values.push(jret.values[key])
				}
				columns.push("save_time = now()")
				let str_sql = `update t_sku_order set ${columns.join(",")} where orderid = '${jret.orderid}'`
				g_App.mysqlCli.query(str_sql, values, function(err, rt){
					if(err == null) return;
					console.log(str_sql, ret, err)
					g_App.log_fetch_error.error(`${str_sql}:${ret}:${err}`)
					g_App.gameToyRedis.call("lpush", "modify_fetch_toy_cmd_error", ret, function(err, ret){
						if(err) return console.log(err);
					});
				});
				g_App.startModifyFetchToyListening();
			}
		});
	}

	startGetGameToyCmdListening(){
		this.gamecomRedis.call("lpop", "cmd_game_toy_list", function(err, ret){
			if(err) return console.log(err);
			if(ret != null){
				g_App.log_mall.info(ret)
				let jret = JSON.parse(ret)
				if(jret.type == "exchange_jd_cards"){
					let strSql = "update t_jd set pid = ? , send_time = ? where card_pwd = ?;";
					g_App.mysqlCli.query(strSql, [jret.pid, jret.time, jret.card_pwd], function(err, rt){
						if(err){
							console.log(strSql, ret, err)
							g_App.log_mall_error.error(`${strSql}:${ret}:${err}`)
							g_App.gameToyRedis.call("lpush", "game_toy_cmd_error", ret, function(err, ret){
								if(err) return console.log(err);
							});
						}
					});
				}
				else if(jret.type == "exchange_qb_cards"){
					let strSql = "update t_qb set pid = ? , send_time = ? where card_pwd = ?;";
					g_App.mysqlCli.query(strSql, [jret.pid, jret.time, jret.card_pwd], function(err, rt){
						if(err){
							console.log(strSql, ret, err)
							g_App.log_mall_error.error(`${strSql}:${ret}:${err}`)
							g_App.gameToyRedis.call("lpush", "game_toy_cmd_error", ret, function(err, ret){
								if(err) return console.log(err);
							});
						}
					});
				}
				else if(jret.type == "exchange_hf_cards"){
					let strSql = "insert into t_phone_log_ex(playerid, type, phone, amount, num, state, times) values(?,0,?,?,?,0,now());";
					g_App.mysqlCli.query(strSql, [jret.pid, jret.phone, jret.value, jret.value], function(err, rt){
						if(err){
							console.log(strSql, ret, err)
							g_App.log_mall_error.error(`${strSql}:${ret}:${err}`)
							g_App.gameToyRedis.call("lpush", "game_toy_cmd_error", ret, function(err, ret){
								if(err) return console.log(err);
							});	
						}
					});
				}
				else{
					g_App.log_mall_error.error(`${ret}:type is not found`)
				}
				g_App.startGetGameToyCmdListening();
			}
		});
	}

	get_ts(){
		return Math.floor(new Date().getTime() / 1000)
	}

	get_ms(){
		return new Date().getTime()
	}

}

module.exports = GameGlobalApp;