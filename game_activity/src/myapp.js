const NetWork = require("network")
const IndianaSystem = require("./indiana")
const InvitationtoySystem = require("./invitation_toy")
const log4js = require("log4js")
log4js.configure(g_configs.log_configs)

class GameActivityApp{
	constructor(){
		this.IndianaSystem = new IndianaSystem();
		this.InvitationtoySystem = new InvitationtoySystem();
		this.gamecomRedis = new NetWork.RedisCli("gamecom", g_configs.redis_configs["game_com"], "dp_gamecom_sha")
		this.subGamecomRedis = new NetWork.RedisCli("subgamecom", g_configs.redis_configs["game_com"], null)
		this.gameToyRedis = new NetWork.RedisCli("gametoy", g_configs.redis_configs["game_toy"], "dp_gametoy_sha")
		
		this.log_sys_error = log4js.getLogger("syserror")
	}

	lanuch(){
		this.registerSubcribeEvent()

		this.subGamecomRedis.call("on", "message", function(channel, message){
			g_App.onRecvSubscribeEvent(channel, message)
		});

		this.IndianaSystem.setupIndianaEvent();
		this.setupSwitchDayEvent()
	}

	registerSubcribeEvent(){
		this.subGamecomRedis.call("subscribe", "reload_indiana_cfg");
		this.subGamecomRedis.call("subscribe", "change_invitation_charge_data");
		this.subGamecomRedis.call("subscribe", "change_invitation_invite_data");
		this.subGamecomRedis.call("subscribe", "change_invitation_catch_data");
	}

	on_reload_indiana_cfg(){
		this.IndianaSystem.setupIndianaEvent();
	}

	on_change_invitation_charge_data(message){
		this.InvitationtoySystem.changeCharge(message)
	}

	on_change_invitation_invite_data(message){
		this.InvitationtoySystem.changeInvite(message)
	}

	on_change_invitation_catch_data(message){
		this.InvitationtoySystem.changeCatch(message)
	}

	onRecvSubscribeEvent(channel, message){
		let key = "on_" + channel
		let func = this[key]
		if(func != null) func.call(this, message);
	}

	setupSwitchDayEvent(auto){
		if(auto){
			this.IndianaSystem.startCloseEvt();
		}

		if(this.ref_switch_evt != null) clearTimeout(this.ref_switch_evt);
		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

		let next_check = 24 * 3600 - today_ts
		this.ref_switch_evt = setTimeout(this.setupSwitchDayEvent.bind(this), next_check * 1000, true)	
	}

	get_ts(){
		return Math.floor(new Date().getTime() / 1000)
	}

	get_ms(){
		return new Date().getTime()
	}

}

module.exports = GameActivityApp;