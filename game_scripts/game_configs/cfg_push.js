let deal = function(client, cfgs){
	let real_cfg = {}
	let all_keys = []
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		let time = cfg.time.split(":")
		let time_ts = Number(time[0]) * 3600 + Number(time[1]) * 60
		real_cfg[time_ts] = JSON.stringify(cfg)

		all_keys.push(time_ts)
	}
	client.del("cfg_push", function(err, ret){
		if(err) console.log(err);

		client.hset("cfg_push", "all_keys", all_keys.join(","), function(err, ret){
			if(err) return console.log(err);
			client.publish("reload_push_cfg", "", function(err, ret){
				if(err) return console.log(err);
			});
		});

		for(let key in real_cfg){
			client.hset("cfg_push", key, real_cfg[key], function(err, ret){
				if(err) console.log(err);	
			});
		}
	});
}

module.exports = {
	deal : deal,
}