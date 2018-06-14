let init = function(client, callback){
	client.hdel("cfg_game_room_client", "trinity", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let trinity_room_set = {}
	let describe = ""
	let room = 0
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if (cfg.id == 0){
			describe = cfg.cost
		}else{
			if(trinity_room_set[cfg.gear] == null) trinity_room_set[cfg.gear] = [];
			trinity_room_set[cfg.gear].push(cfg)
			room ++
		}

	}

	trinity_room_set[0] = []
	trinity_room_set[0].push({describe:describe})

	client.hset("cfg_game_room_client", "trinity", JSON.stringify(trinity_room_set), function(err, ret){
		if(err) return console.log(err);
	});
}

module.exports = {
	init : init,
	deal : deal,
}