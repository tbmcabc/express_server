let deal = function(client, cfgs){
	let real_cfg = {}
	let all_times = []
	let robot_evt = []
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		let begin_time = cfg.begin_time.split(":")
		cfg.begin_time = Number(begin_time[0]) * 3600 + Number(begin_time[1]) * 60
		let end_time = cfg.end_time.split(":")
		cfg.end_time = Number(end_time[0]) * 3600 + Number(end_time[1]) * 60
		let robot_enter = cfg.robot_enter.split(":")
		cfg.robot_enter = Number(robot_enter[0]) * 3600 + Number(robot_enter[1]) * 60

		real_cfg[cfg.id] = JSON.stringify(cfg)

		all_times.push({ end : cfg.end_time, id : cfg.id })

		robot_evt.push({ begin : cfg.robot_enter, end : cfg.end_time, id : cfg.id })
	}
	client.del("cfg_indiana", function(err, ret){
		if(err) console.log(err);
		let load_end = false;
		client.hset("cfg_indiana", "all_times", JSON.stringify(all_times), function(err, ret){
			if(err) return console.log(err);
			if(load_end){
				client.publish("reload_indiana_cfg", "", function(err, ret){
					if(err) return console.log(err);
				});
			}
			load_end = true;
		});

		client.hset("cfg_indiana", "robot_evt", JSON.stringify(robot_evt), function(err, ret){
			if(err) return console.log(err);
			if(load_end){
				client.publish("reload_indiana_cfg", "", function(err, ret){
					if(err) return console.log(err);
				});
			}
			load_end = true;
		});

		for(let key in real_cfg){
			client.hset("cfg_indiana", key, real_cfg[key], function(err, ret){
				if(err) console.log(err);	
			});
		}
	});
}

module.exports = {
	deal : deal,
}