let init = function(client, callback){
	client.del("cfg_pay_client", function(err, ret){
		callback(err);	
	});
	client.del("cfg_pay_client_hoodle", function(err, ret){
		callback(err);	
	});
}

let gen_cli_cfg = function(cfg){
	cfg = CloneObject(cfg)
	delete cfg.in_plat
	delete cfg.out_plat
	delete cfg.hide
	return JSON.stringify(cfg)
}

let deal = function(client, cfgs){
	let cfg_show_gold = []
	let cfg_show_hoodle = []
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(cfg.hide != "1"){
			if(cfg.charge_type != "hoodle"){
				cfg_show_gold.push(JSON.stringify(cfg))
			}else{
				cfg_show_hoodle.push(JSON.stringify(cfg))
			}
		}
	}
	client.set("cfg_pay_client", JSON.stringify(cfg_show_gold), function(err, ret){
			if(err) console.log(err);
	});
	client.set("cfg_pay_client_hoodle", JSON.stringify(cfg_show_hoodle), function(err, ret){
			if(err) console.log(err);
	});
}

module.exports = {
	init : init,
	deal : deal,
}