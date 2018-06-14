const crypto = require('crypto')
const GameframeProto = require("protocol").GameframeProto
const NetWork = require("network")
const HDUtils = require("hd-utils")


let publicDecrypt = function(publicKey, sign){
	let input = sign
	let output = Buffer.alloc(2048)
	let input_offset = 0
	let output_offset = 0
	while(input_offset < input.length){
		let buf = Buffer.alloc(128)
		input.copy(buf, 0, input_offset, input_offset + 128)
		let out = crypto.publicDecrypt(publicKey, buf);
		out.copy(output, output_offset, 0, out.length)
		output_offset = output_offset + out.length
		input_offset = input_offset + 128
	}
	let org = Buffer.alloc(output_offset)
	output.copy(org, 0, 0, output_offset)
	return org
}

class GameGateHost extends NetWork.Server{
	constructor(){
		super("GameGateHost", GameframeProto)

		this.mapAgency = {}

		this.setupProtoHandler()
	}

	setupProtoHandler(){
		this.regMsgHandler(GameframeProto.COM_GAME_FRAMEWORK.eC2S_Login, this.onMsgLogin.bind(this))
	}

	procMsg(ws, buf, ext) {
        let msgPack = new NetWork.MsgPack(buf)
        let protoId = msgPack.unpackProtoID();

        let msgName = this._PROTO.ProtoNameMap[protoId]
        if(!msgName){
            console.log(`protoId: ${protoId} is not define`)
            return
        }

        let handlerList = this._msgHandler[protoId];
        if (!handlerList ||  ws.stage != handlerList.stage) {
            return;
        }

        let msg = new this._PROTO[msgName]();
        msg.__buf = buf;
        msg.Unpack(msgPack)

        for (let i in handlerList.callback) {
            let cb = handlerList.callback[i];
            cb(ws, msg, ext)
        }
    }

	getPlayerAgency(pid){
		if(!pid) return null;
		return this.mapAgency[pid];
	}

	getPlayerCnt(){
		return Object.keys(this.mapAgency).length;
	}

	initWs(ws, pid){
		ws.pid = pid
		ws.stage = "GameWorld"
	}

	sendJsonMsgToPlayer(pid, json){		
		let agency = this.getPlayerAgency(pid)
		if(agency == null) return;
		let ggmsg = new GameframeProto.S2C_Json();
		ggmsg.json = json
		agency.sendMsg(ggmsg)
	}


	onMsgLogin(ws, msg){
		try{
			//解密Token
			let token = publicDecrypt(g_configs.rsa.publicKey, Buffer.from(msg.token, "hex")).toString()
			let data = JSON.parse(token)
			//构建newtoken 
			let newtoken = HDUtils.Md5.Get_MD5(`${data.pid}${new Date().getTime()}`);

			//存入redis 
			g_App.gamecomRedis.evalsha("gg_player_online", 0, data.pid, data.dbid, g_configs.sid, newtoken, function(err, ret){
				if(err) return console.log(err);
			});

			this.initWs(ws, data.pid)
			let agency = this.getPlayerAgency(data.pid)
			if(agency && agency != ws){agency.close()}
			this.mapAgency[data.pid] = ws

		    //返回给客户端 1: pid 2: dbid 3:token
        	let jsonmsg = JSON.stringify({ http_params:{
        		pid:data.pid,
        		dbid:data.dbid,
        		key:newtoken
        	},params:g_App.base64.encode(data.params),op:"s2c_login"})
        	this.sendJsonMsgToPlayer(data.pid,jsonmsg)
		}catch(err){
			console.log(err)
		}
	}

	onCloseConnection(ws){
		if(!ws.pid) return;
		let agency = this.getPlayerAgency(ws.pid)
		if(agency && agency == ws){
			if (ws.ingro_clear_auth != true){
				g_App.gamecomRedis.evalsha("gg_player_offline", 0, ws.pid, function(err, ret){
					if(err) return console.log(err);
				});
			}
			delete this.mapAgency[ws.pid]
		}
	}

	registerSubcribeEvent(){
		g_App.subGamecomRedis.call("subscribe", "player_online");
		g_App.subGamecomRedis.call("subscribe", "send_msg_to_player");
		g_App.subGamecomRedis.call("subscribe", "send_msg_to_players");
		g_App.subGamecomRedis.call("subscribe", "send_msg_to_all");
	}

	on_player_online(msg){
		let jmsg = JSON.parse(msg)
		if (jmsg.ggid != g_configs.sid){
			let agency = this.getPlayerAgency(jmsg.pid)
			if(agency){ 
				agency.ingro_clear_auth = true
				agency.close();
			}
		}
	}

	on_send_msg_to_player(msg){
		let jmsg = JSON.parse(msg)
		this.sendJsonMsgToPlayer(jmsg.pid, jmsg.json)
	}

	on_send_msg_to_players(msg){
		let jmsg = JSON.parse(msg)
		let ggmsg = new GameframeProto.S2C_Json();
		ggmsg.json = jmsg.json

		for (let i = 0; i < jmsg.pids.length; i++) {
			let agency = this.getPlayerAgency(jmsg.pids[i])
			if(agency == null) continue;
			agency.sendMsg(ggmsg)
		}
	}

	on_send_msg_to_all(msg){
		let ggmsg = new GameframeProto.S2C_Json();
		ggmsg.json = msg

		for( let pid in this.mapAgency){
			this.mapAgency[pid].sendMsg(ggmsg)
		}
	}

	onRecvSubscribeEvent(channel, message){
		let key = "on_" + channel
		let func = this[key]
		if(func != null) func.call(this, message);
	}
}

module.exports = GameGateHost;