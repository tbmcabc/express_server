class IndianaSystem{
	constructor(){
		this.close_evt = []	
	}

	setupIndianaEvent(){
		this.startRobotEnterEvt();
		this.startCloseEvt();
	}

	startRobotEnterEvt(){
		if(this.ref_robot_evt != null) clearTimeout(this.ref_robot_evt);
		let self = this;
		g_App.gamecomRedis.call("hget", "cfg_indiana", "robot_evt", function (err, ret) {
			if(err) return console.log(err);
			self.robot_evt = JSON.parse(ret)
			self.onRobotEnter()
		});
	}

	onRobotEnter(){
		if(this.ref_robot_evt != null) clearTimeout(this.ref_robot_evt);
		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

		for(let idx in this.robot_evt){
			let cfg = this.robot_evt[idx]
			if(today_ts < cfg.begin || today_ts > (cfg.end - 60)) continue;
			g_App.gamecomRedis.evalsha("ga_get_indiana_luck", 0, 
				"ROBOT", 
				cfg.id, 
				now.toLocaleDateString(), today_ts, "", "",
				now.toLocaleString(), "0", function(err, ret){
				if(err) return console.log(err);
			});
		}
		let time = 20 + Math.floor(Math.random() * 20);
		this.ref_robot_evt = setTimeout(this.onRobotEnter.bind(this), time * 1000);
	}

	startCloseEvt(){
		for(let idx in this.close_evt){
			clearTimeout(this.close_evt[idx])
		}
		this.close_evt = []
		let self = this
		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

		g_App.gamecomRedis.call("hget", "cfg_indiana", "all_times", function(err, ret){
			if(err) return console.log(err);
			
			let jret = JSON.parse(ret)
			for(let idx in jret){
				let cfg = jret[idx]
				if(today_ts < cfg.end){
					let ref_close_evt = setTimeout(self.onCloseIndiana.bind(self), (cfg.end - today_ts) * 1000, cfg.id);
					self.close_evt.push(ref_close_evt)
				}
			}
		});
	}

	onCloseIndiana(id){
		let now_date = new Date().toLocaleDateString()
		g_App.gamecomRedis.evalsha("ga_before_close_indiana", 0, id, now_date, function(err, ret){
			if(err) return console.log(err);
			if(ret < 0) return;

			g_App.gamecomRedis.evalsha("ga_close_indiana", 0, id, now_date, ret, function(err, ret){
				if(err)  return console.log(err);
				if(ret == 0) return;

				g_App.gameToyRedis.evalsha("ga_close_indiana", 0, ret, 
					g_App.get_ts(), 
					new Date().toLocaleString(), function(err, ret){
					if(err) return console.log(err);
				});
			});
		});
	}
}

module.exports = IndianaSystem;