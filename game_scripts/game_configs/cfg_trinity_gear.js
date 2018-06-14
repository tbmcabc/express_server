let init = function(client, callback){
	client.del("cfg_trinity_gear", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let trinity_gear_set = {}
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(trinity_gear_set[cfg.gear] == null) trinity_gear_set[cfg.gear] = [];
		trinity_gear_set[cfg.gear].push(cfg)
	}

	for (let gear in trinity_gear_set) {
		client.hset("cfg_trinity_gear", gear, JSON.stringify(trinity_gear_set[gear]), function(err, ret){
			if(err) return console.log(err);
		});
	}
}

module.exports = {
	init : init,
	deal : deal,
}