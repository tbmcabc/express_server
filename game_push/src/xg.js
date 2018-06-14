const HDUtils = require("hd-utils")

class XGUtils{
	constructor(){
		this.XgAPIAndroid = new HDUtils.XGAPI(g_configs.xg_configs.android);
		this.XgAPIIOS = new HDUtils.XGAPI(g_configs.xg_configs.ios);
	}

	send_msg_to_player(pid, message, sendtime){
		let self = this
		g_App.sdkLoginRedis.call("hget", "map_xg_token", pid, function(err, ret){
			if(err) return console.log(err)
				
			if(ret == null || ret == "") return;
			if(ret.length < 60)
				self.XgAPIAndroid.push_to_single_android(ret, JSON.stringify({title:"啥都可以抓","content":message}), sendtime, function(ret){
					g_App.log_xg_push.info(`push_to_single_android ${pid} ${message} ${sendtime} ${ret}`)
				});
			else{
				self.XgAPIIOS.push_to_single_ios(ret, JSON.stringify({aps:{alert:message}}), sendtime, function(ret){
					g_App.log_xg_push.info(`push_to_single_ios ${pid} ${message} ${sendtime} ${ret}`)
				});
			}
		});
	}

	send_msg_to_all(message){
		this.XgAPIAndroid.push_to_all_android(JSON.stringify({title:"啥都可以抓","content":message}), function(ret){
			g_App.log_xg_push.info(`push_to_all_android ${message} ${ret}`)
		});
		this.XgAPIIOS.push_to_all_ios(JSON.stringify({aps:{alert:message}}), function(ret){
			g_App.log_xg_push.info(`push_to_all_ios ${message} ${ret}`)
		});
	}

	startPushServices(){
		if(this.ref_push_evt != null){
			clearTimeout(this.ref_push_evt)
			this.ref_push_evt = null
		}
		let self = this
		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

		g_App.gamecomRedis.call("hget", "cfg_push", "all_keys", function(err, ret){
			if(err) return console.log(err);

			if(ret != null){
				let times = ret.split(",")
				for(let i = 0 ; i < times.length; i++){
					let push_ts = Number(times[i])
					if(today_ts < push_ts){
						self.ref_push_evt = setTimeout(self.push_cfg_message.bind(self), (push_ts - today_ts + 5) * 1000, push_ts);
						return;
					}
				}
			}
		});

		this.load_push_cfg()
	}


	push_cfg_message(key){
		let self = this
		g_App.gamecomRedis.call("hget", "cfg_push", key, function(err, ret){
			if(err) return console.log(err);

			if(ret == null) return;

			let jret = JSON.parse(ret)
			if(jret.content == "OfflinePush"){
				self.push_offine_player()
			}
			else{
				//self.send_msg_to_all(jret.content)
			}
			g_App.log_xg_push.info(`push_cfg_message ${ret}`)
		});

		this.ref_push_evt = null

		this.startPushServices()
	}

	load_push_cfg(){
		let self = this
		g_App.gamecomRedis.call("hgetall", "cfg_push_tag", function(err, ret){
			if(err) return console.log(err);

			self.cfg_push_tag = ret;
		});

		g_App.gamecomRedis.call("hgetall", "cfg_toy_push_tag", function(err, ret){
			if(err) return console.log(err);

			self.cfg_toy_push_tag = ret;
		})
	}

	random_push_tag(tags){
		tags = tags.split(",")
		if(tags.length == 0){
			tags = Object.keys(this.cfg_push_tag)
		}
		if(tags.length == 0) return null;
		let idx = Math.floor(Math.random() * (tags.length))
		if(idx == tags.length) idx = tags.length - 1;
		let tag = tags[idx]

		let tag_content = this.cfg_push_tag[tag]
		if(tag_content == null) return;

		let toy_tag = this.cfg_toy_push_tag[tag]
		if(toy_tag == null) return null;

		let jtoys = JSON.parse(toy_tag)
		let toy_idx = Math.floor(Math.random() * (jtoys.length))
		if(toy_idx == jtoys.length) toy_idx = jtoys.length - 1;
		let jtoys_cfg = JSON.parse(tag_content)
		return jtoys_cfg.content.replace("TOYNAME", jtoys[toy_idx])
	}

	push_offine_player(){
		if(this.cfg_push_tag == null || this.cfg_toy_push_tag == null) return;
		let self = this
		g_App.gamecomRedis.evalsha("gp_get_xg_push", 0, function(err, ret){
			if(err) return console.log(err);

			let jret = JSON.parse(ret)
			for(let pid in jret){
				let toy = self.random_push_tag(jret[pid])
				if(toy == null) toy = "全新新品上线,上线看一下吧";
				self.send_msg_to_player(pid, toy);
				
				g_App.log_xg_push.info(`push_offine_player ${pid} ${toy}`)
			}
		});
	}

}

module.exports = XGUtils;