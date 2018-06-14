let init = function(client, callback){
	client.del("cfg_toy_room_set", function(err, ret){
		callback(err);	
	});
}

let deal = function(client, cfgs){
	let room_live_set = {}
	let set = {}
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(set[cfg.toy_id] == null) set[cfg.toy_id] = [];
		set[cfg.toy_id].push(cfg.room_id)
		room_live_set[cfg.room_id] = cfg.live_id
	}

	for (let pid in set) {
		client.hset("cfg_toy_room_set", pid, JSON.stringify(set[pid]), function(err, ret){
			if(err) console.log(err);
		});
	}

	client.del("cfg_toy_room_live", function(err, ret){
		if(err) return console.log(err);

		for (let rid in room_live_set) {
			client.hset("cfg_toy_room_live", rid, room_live_set[rid], function(err, ret){
				if(err) return console.log(err);
			});
		}
	});
}

module.exports = {
	init : init,
	deal : deal,
}