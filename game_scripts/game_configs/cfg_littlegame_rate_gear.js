let init = function(client, callback){
	client.del("cfg_littlegame_rate_gear", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){

	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		let rates = {}
		for(v in cfg){
			if (v != "rate_gear"){
				rates[`${v}`] = cfg[`${v}`]
			}
		}
		client.hset("cfg_littlegame_rate_gear", cfg.rate_gear, JSON.stringify(rates), function(err, ret){
				if(err) return console.log(err);
		});
	}
}

module.exports = {
	init : init,
	deal : deal,
}