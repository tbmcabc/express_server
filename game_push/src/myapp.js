const NetWork = require("network")
const XGUtils = require("./xg")
const log4js = require("log4js")
log4js.configure(g_configs.log_configs)

class GamePushApp{
	constructor(){
	
		this.XgUtils = new XGUtils();
		this.gamecomRedis = new NetWork.RedisCli("gamecom", g_configs.redis_configs["game_com"], "dp_gamecom_sha")
		this.subGamecomRedis = new NetWork.RedisCli("subgamecom", g_configs.redis_configs["game_com"], null)
		this.sdkLoginRedis = new NetWork.RedisCli("sdklogin", g_configs.redis_configs["sdk_login"], null)
		
		this.log_sys_error = log4js.getLogger("syserror")
		this.log_xg_push = log4js.getLogger("xg_push")
	}

	lanuch(){
		
		this.registerSubcribeEvent()

		this.subGamecomRedis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});

		this.XgUtils.startPushServices()
		this.setupSwitchDayEvent()
	}

	setupSwitchDayEvent(auto){
		if(auto){
			this.on_switch_day();
			this.XgUtils.startPushServices();
		}

		if(this.ref_switch_evt != null) clearTimeout(this.ref_switch_evt);
		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

		let next_check = 24 * 3600 - today_ts
		this.ref_switch_evt = setTimeout(this.setupSwitchDayEvent.bind(this), next_check * 1000, true)	
	}

	on_switch_day(){
		g_App.gamecomRedis.evalsha("gp_update_xg_push", 0, function(err, ret){
			if(err) return console.log(err);
		});
	}
		
	registerSubcribeEvent(){
		this.subGamecomRedis.call("subscribe", "send_xg_msg_to_player")
		this.subGamecomRedis.call("subscribe", "player_online")
		this.subGamecomRedis.call("subscribe", "player_offline")
		this.subGamecomRedis.call("subscribe", "reload_push_cfg")
	}

	on_reload_push_cfg(){
		this.XgUtils.startPushServices();
	}

	on_player_offline(msg){
		let jmsg = JSON.parse(msg)

		g_App.gamecomRedis.evalsha("gp_set_xg_push", 0, jmsg.pid, function(err, ret){
			if(err) return console.log(err)
		});
	}


	on_player_online(msg){
		let jmsg = JSON.parse(msg)

		g_App.gamecomRedis.evalsha("gp_del_xg_push", 0, jmsg.pid, function(err, ret){
			if(err) return console.log(err)
		});
	}

	on_send_xg_msg_to_player(msg){
		let jmsg = JSON.parse(msg)
		g_App.XgUtils.send_msg_to_player(jmsg.pid, jmsg.msg, jmsg.sendtime)
	}

	onRecvSubscribeEvent(channel, message){
		let key = "on_" + channel
		let func = this[key]
		if(func != null) func.call(this, message);
	}

	get_ts(){
		return Math.floor(new Date().getTime() / 1000)
	}

	get_ms(){
		return new Date().getTime()
	}

}

module.exports = GamePushApp;