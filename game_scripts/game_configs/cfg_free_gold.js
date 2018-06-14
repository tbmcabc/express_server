let init = function(client, callback){
	client.del("cfg_free_gold_client", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let real_cfg = {}
	let all_keys = []
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(cfg.begin_time == "describe"){
			client.set("cfg_free_gold_client", cfg.total_gold, function(err, ret){
				if(err) return console.log(err);
			});
		}
		else{
			let time = cfg.begin_time.split(":")
			let time_ts = Number(time[0]) * 3600 + Number(time[1]) * 60
			real_cfg[time_ts] = JSON.stringify(cfg)

			all_keys.push(time_ts)
		}
	}
	client.del("cfg_free_gold", function(err, ret){
		if(err) console.log(err);

		client.hset("cfg_free_gold", "all_keys", all_keys.join(","), function(err, ret){
			if(err) return console.log(err);
		});

		for(let key in real_cfg){
			client.hset("cfg_free_gold", key, real_cfg[key], function(err, ret){
				if(err) console.log(err);	
			});
		}
	});
}

module.exports = {
	init : init,
	deal : deal,
}