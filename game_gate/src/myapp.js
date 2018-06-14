const fs = require("fs")
const GameGateHost = require("./md_host")
const NetWork = require("network")
const HDUtils = require("hd-utils")

class GameGateApp{
	constructor(){
		this.GameGateHost = new GameGateHost()
		this.base64 = new HDUtils.Base64()
		this.gamecomRedis = new NetWork.RedisCli("game_com", g_configs.redis_configs["game_com"], "dp_gamecom_sha")
		this.subGamecomRedis = new NetWork.RedisCli("sub_game_com", g_configs.redis_configs["game_com"], null)
	}

	lanuch(){
		g_configs.rsa = {
		    publicKey : fs.readFileSync("rsa_public_key.pem").toString(),
		}

		this.GameGateHost.start(g_configs.gate_host.ip, g_configs.gate_host.port)

		this.GameGateHost.registerSubcribeEvent()
		
		this.subGamecomRedis.call("on", "message", function(channel, message){
			g_App.GameGateHost.onRecvSubscribeEvent(channel, message)
		});

		setInterval(this.sync_server_state.bind(this), 10000)
	}

	sync_server_state(){
		g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
			table : "t_game_srv_state",
			model : "insert_or_update",
			values : {
				sid : g_configs.sid,
	            serverType : "GameGate",
	            playerNum : g_App.GameGateHost.getPlayerCnt(),
			},
			modifys : ["playerNum"]
		}), function(err, ret){
			if(err) return console.log(err);
		});
	}
}

module.exports = GameGateApp;