let init = function(client, callback){
	client.del("cfg_rushhour_gear", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let rushhour_gear_set = {}
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(rushhour_gear_set[cfg.gear] == null) rushhour_gear_set[cfg.gear] = [];
		rushhour_gear_set[cfg.gear].push(cfg)
	}

	for (let gear in rushhour_gear_set) {
		client.hset("cfg_rushhour_gear", gear, JSON.stringify(rushhour_gear_set[gear]), function(err, ret){
			if(err) return console.log(err);
		});
	}
}

module.exports = {
	init : init,
	deal : deal,
}