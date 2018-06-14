const HDUtils = require("hd-utils")
const NetWork = require("network")
const mysql = require("mysql")
const log4js = require("log4js")
const ThirdSystem = require("./utils/third")
log4js.configure(g_configs.log_configs)

class GameToyApp{
	constructor(){
		this.md_http = require("./md_http")
		
		this.mysqlCli = mysql.createPool(g_configs.db_config)
		this.base64 = new HDUtils.Base64();
		this.gamecomRedis = new NetWork.RedisCli("gamecom", g_configs.redis_configs["game_com"], "dp_gamecom_sha")
		this.subGamecomRedis = new NetWork.RedisCli("subgamecom", g_configs.redis_configs["game_com"], null)
		this.gameToyRedis = new NetWork.RedisCli("gametoy", g_configs.redis_configs["game_toy"], "dp_gametoy_sha")
		this.gameSdkRedis = new NetWork.RedisCli("sdklogin", g_configs.redis_configs["sdk_login"], "sdk_login_sha")

		this.log_http_error = log4js.getLogger("httperror")
		this.log_toy = log4js.getLogger("toy")
		this.log_sys_error = log4js.getLogger("syserror")
		this.ThirdSystem = new ThirdSystem();
	}

	lanuch(){
		this.md_http.start()
		this.registerSubcribeEvent()


		this.subGamecomRedis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});
	}

	get_ts(){
		return Math.floor(new Date().getTime() / 1000)
	}

	get_ms(){
		return new Date().getTime()
	}

	registerSubcribeEvent(){
		this.subGamecomRedis.call("subscribe", "reply_third_cmd_notify")
	}


	on_reply_third_cmd_notify(msg){
		g_App.ThirdSystem.on_get_third_cmd(msg)
	}

	onRecvSubscribeEvent(channel, message){
		let key = "on_" + channel
		let func = this[key]
		if(func != null) func.call(this, message);
	}


}

module.exports = GameToyApp;