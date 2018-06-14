let init = function(client, callback){
	client.del("cfg_global", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		client.hset("cfg_global", cfg.key, cfg.value, function(err, ret){
			if(err) console.log(err);
		});	
	}
}

module.exports = {
	init : init,
	deal : deal,
}