let init = function(client, callback){
	client.hdel("cfg_game_room_client", "ddz", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let ddz_room_set = {}
	let describe = ""
	let room = 0
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if (cfg.id == 0){
			describe = cfg.cost
		}else{
			if(ddz_room_set[cfg.gear] == null) ddz_room_set[cfg.gear] = [];
			ddz_room_set[cfg.gear].push(cfg)
			room++
		}

	}

	ddz_room_set[0] = []
	ddz_room_set[0].push({describe:describe})

	client.hset("cfg_game_room_client", "ddz", JSON.stringify(ddz_room_set), function(err, ret){
		if(err) return console.log(err);
	});

}

module.exports = {
	init : init,
	deal : deal,
}