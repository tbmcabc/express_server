
let deal = function(client, cfgs){
	let toys = {}
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		for(let j = 1; j <= 3; j++){
			let toy_id = cfg[`need_toy_id_${j}`]
			let toy_num =  cfg[`need_toy_num_${j}`]
			if(toy_id != ""){
				toys[toy_id] = 1
				if(Number(toy_num) == NaN){
					throw "cfg_toy_redbag cfg:"+i+",toy_id:" + toy_id + ", num is error";
				}
			}
		}
	}
	
	client.hset("cfg_toy_redbag", "toys_map", JSON.stringify(Object.keys(toys)), function(err, ret){
		if(err) return console.log(err);
	});
}


module.exports = {
	deal : deal,
}