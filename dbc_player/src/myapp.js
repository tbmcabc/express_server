const HDUtils = require("hd-utils")
const ThirdSystem = require("./utils/third")
const NetWork = require("network")
const log4js = require("log4js")
log4js.configure(g_configs.log_configs)

const PlayerManager = require("./manager/player_manager")

class DbcPlayerApp{
	constructor(){
		this.md_http = require("./md_http")
		
		this.playerManager = new PlayerManager()
		this.base64 = new HDUtils.Base64();
		this.TLS = new HDUtils.TLS.Sig(g_configs.live_cfg);

		let admin_sig = this.TLS.genSig(g_configs.live_cfg.admin_identifier)
		this.ToyAPI = new HDUtils.ToyAPI({
			sdk_appid : g_configs.live_cfg.sdk_appid,
			admin_identifier : g_configs.live_cfg.admin_identifier,
			admin_sig : admin_sig
		});
		this.ThirdSystem = new ThirdSystem();		
		this.YylAPI = new HDUtils.YYLAPI(g_configs.yyl_cfg);
		this.ZgcAPI = new HDUtils.ZGCAPI();
		this.PaidAPI = new HDUtils.PaidAPI();
		this.playerRedis = new NetWork.RedisCli("player", g_configs.redis_configs["player"], "dp_cache_sha")
		this.gamecomRedis = new NetWork.RedisCli("game_com", g_configs.redis_configs["game_com"], "dp_gamecom_sha")
		this.subgamecomRedis = new NetWork.RedisCli("sub_game_com", g_configs.redis_configs["game_com"], null)
		this.gameToyRedis = new NetWork.RedisCli("game_toy", g_configs.redis_configs["game_toy"], "dp_gametoy_sha")
		this.gameH5Redis = new NetWork.RedisCli("game_h5", g_configs.redis_configs["game_h5"], "dp_game_h5_sha")
		this.subGameH5Redis = new NetWork.RedisCli("sub_game_h5", g_configs.redis_configs["game_h5"], null)

		this.log_http_error = log4js.getLogger("httperror")
		this.log_sys_error = log4js.getLogger("syserror")
		this.log_access_error = log4js.getLogger("accesserror")
		this.log_pay = log4js.getLogger("pay")
		this.log_pay_error = log4js.getLogger("payerror")
		this.log_mall_error = log4js.getLogger("mallerror")
		this.log_live_error = log4js.getLogger("liveerror")
		this.log_fetch_error = log4js.getLogger("fetcherror")
		this.log_redis_error = log4js.getLogger("rediserror")
		this.log_control = log4js.getLogger("control")
	}

	lanuch(){
		this.md_http.start()

		this.registerSubcribeEvent()

		this.subgamecomRedis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});

		this.subGameH5Redis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});	

		setInterval(this.update_game_control.bind(this), 30000)

		this.load_cfg_global()
	}

	update_game_control(){
		g_App.gamecomRedis.call("hgetall", "game_server_control", function(err, ret){
			if(err) return console.log(err);

			g_App.cfg_game_control = ret
		});

		this.load_cfg_global()
	}

	load_cfg_global(print_log){
		g_App.gamecomRedis.call("hgetall", "cfg_global", function(err, ret){
			if(err) return console.log(err);			

			g_App.cfg_global = ret
			if(print_log)console.log("load cfg_global_success : ", ret)
		});
	}

	registerSubcribeEvent(){
		this.subgamecomRedis.call("subscribe", "player_offline");
		this.subgamecomRedis.call("subscribe", "add_cmd_notify");
		this.subgamecomRedis.call("subscribe", "reload_cfg_global");
		this.subGameH5Redis.call("subscribe", "h5_sd_finished_notify")

		this.subgamecomRedis.call("subscribe", "little_game_enter_log");

		for(let dbid in g_configs.db_configs){
			let dbc_player_notify_key = "dbc_player_notify_" + dbid
			this.subgamecomRedis.call("subscribe", dbc_player_notify_key);
			this["on_" + dbc_player_notify_key] = this.on_dbc_player_notify
		}
		

	}

	on_dbc_player_notify(msg){
		g_App.ThirdSystem.get_third_cmd(msg)
	}

	on_reload_cfg_global(msg){
		this.load_cfg_global(true)
	}

	on_player_offline(msg){
		let jmsg = JSON.parse(msg)
		if(jmsg.pid != null){
			let sp = this.playerManager.getPlayerCacheByIDEx(jmsg.pid)
			if(sp == null) return
			g_App.playerManager.saveAndDelPlayerCache(sp)

			this.gameToyRedis.evalsha("gy_player_offline", 0, jmsg.pid, function(err, ret){
				if(err) return console.log(err);
			});
		}
	}

	on_add_cmd_notify(pid){
		let sp = this.playerManager.getPlayerCacheByIDEx(pid)
		if(sp != null){
			sp.startGetCmdListening()
		}
	}
	
	on_h5_sd_finished_notify (pid) {
		let sp = this.playerManager.getPlayerCacheByIDEx(pid)
		if(sp != null){
			sp.startGetH5FinishedListening_SD()
		}		
	}

	on_little_game_enter_log(msg){
		let jmsg = JSON.parse(msg)
		if(jmsg.pid != null){
			this.playerManager.getPlayerCacheByID(jmsg.pid, function(err, sp){
				if(sp == null) return
				if(jmsg.game_type == "reversalact"){
					g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
						suffix : "month",
						table : "t_enter_reversal_act_log",
						model : "add_date_cnt",
						values : {
							pid : jmsg.pid,
							cnt : 1,
							self_hoodle : sp.hoodle
						},
						modifys:["self_hoodle"]
					}), function(err, ret){
						if(err) return console.log(err);
					});
				}else{
					g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
						suffix : "month",
						table : "t_enter_littlegame_room_log",
						model : "insert",
						values : {
							pid : jmsg.pid,
				            toy_id : jmsg.toy_id,
				            game_type : jmsg.game_type,
				            enter_time : new Date().toLocaleString(),
				            self_hoodle : sp.hoodle
						}
					}), function(err, ret){
						if(err) return console.log(err);
					});
				}
			})
		}
	}
		
	onRecvSubscribeEvent(channel, message){
		let key = "on_" + channel
		let func = this[key]
		if(func != null) func.call(this, message);
	}


	checkDbidValid(dbid){
		return g_configs.db_configs[dbid] != null
	}

	get_ts(){
		return Math.floor(new Date().getTime() / 1000)
	}
}

module.exports = DbcPlayerApp;