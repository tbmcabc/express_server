
class ThirdSystem{
	constructor(){
		this.map_callback = {}

		this.map_timeout = {}
		setInterval(this.checktimeout.bind(this), 1000)
	}

	checktimeout(){
		let now = g_App.get_ts()
		for(let ts of Object.keys(this.map_timeout)){
			if(ts < now){
				let keys = this.map_timeout[ts]
				for(let key of keys) {
					let callback = this.map_callback[key]
					if(callback) callback("timeout", null);
					delete this.map_callback[key];
				}
				delete this.map_timeout[ts]
			}
		}
	}

	push_cmd_to_player(sid, op, params, callback, timeout){
		let self = this
		let key = `${sid}_${op}_${g_App.get_ms()}_${Math.floor(Math.random() * 1000)}`
		g_App.gamecomRedis.call("publish", "dbc_player_notify_" + sid, JSON.stringify({
			key : key,
			op : op,
			params : params
		}), function(err, ret){
			if(err) return callback(err, null);
			self.map_callback[key] = callback
			if(timeout == null) timeout = 5;
			let ts = g_App.get_ts() + timeout
			if(self.map_timeout[ts] == null) self.map_timeout[ts] = [];
			self.map_timeout[ts].push(key)
		});
	}

	on_get_third_cmd(msg){
		let jmsg = JSON.parse(msg)

		if(this.map_callback[jmsg.key] == null) return;
		this.map_callback[jmsg.key](null, jmsg.ret)	

		delete this.map_callback[jmsg.key]	
	}
}

module.exports = ThirdSystem;