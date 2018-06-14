let init = function(client, callback){
	client.del("cfg_reversalact_gear", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let reversalact_gear_set = {}
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(reversalact_gear_set[cfg.gear] == null) reversalact_gear_set[cfg.gear] = [];
		reversalact_gear_set[cfg.gear].push(cfg)
	}

	for (let gear in reversalact_gear_set) {
		client.hset("cfg_reversalact_gear", gear, JSON.stringify(reversalact_gear_set[gear]), function(err, ret){
			if(err) return console.log(err);
		});
	}
}

module.exports = {
	init : init,
	deal : deal,
}