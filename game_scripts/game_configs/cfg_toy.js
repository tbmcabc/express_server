let init = function(client, callback){
	client.del("cfg_toy_client", function(err, ret){
		callback(err);	
	});
}

let gen_cli_cfg = function(cfg){
	cfg = CloneObject(cfg)
	delete cfg.in_plat
	delete cfg.out_plat
	delete cfg.pay_prob
	delete cfg.numerator
	delete cfg.denominator
	delete cfg.exchange_score
	delete cfg.hide
	delete cfg.h5hide
	if(cfg.auto_type == ""){
		delete cfg.auto_type
		delete cfg.auto_val
	}
	if(cfg.original_price == ""){
		delete cfg.original_price
	}
	delete cfg.show_time
	delete cfg.push_tag
	return { cfg : JSON.stringify(cfg) }
}

let deal = function(client, cfgs){
	g_UploadCfgEvent.push(client, "cfg_toy", cfgs)
	let cfg_push_tag = {}
	let cfg_client = {}
	cfg_client.ALL = []
	for (let i = 0; i < cfgs.length; i++) {
		let cfg = cfgs[i]
		if(cfg.hide != "1"){
			if(cfg.show_time != null && cfg.show_time != ""){
				if(cfg_client["ShowTime"] == null) cfg_client["ShowTime"] = [];
				let jtime = JSON.parse(cfg.show_time)
				let deal_cfg = gen_cli_cfg(cfg)
				deal_cfg.begindate_ts = new Date(jtime.beginDate).getTime()
				deal_cfg.enddate_ts = new Date(jtime.endDate).getTime()
				let begintime = jtime.beginTime.split(":")
				deal_cfg.begintime_ts = Number(begintime[0]) * 3600 + Number(begintime[1]) * 60
				let endtime = jtime.endTime.split(":")
				deal_cfg.endtime_ts = Number(endtime[0]) * 3600 + Number(endtime[1]) * 60
				deal_cfg.in_plat = cfg.in_plat
				deal_cfg.out_plat = cfg.out_plat
				cfg_client["ShowTime"].push(deal_cfg)
				continue;
			}
			if(cfg.in_plat == "" && cfg.out_plat == ""){
				cfg_client.ALL.push(gen_cli_cfg(cfg))
			}
			else if(cfg.in_plat != ""){
				let plat_ids = cfg.in_plat.split(",")
				for(let i in plat_ids){
					let all_key = "IN_" + plat_ids[i]
					if(cfg_client[all_key] == null) cfg_client[all_key] = []

					cfg_client[all_key].push(gen_cli_cfg(cfg))
				}
			}
			else if(cfg.out_plat != ""){
				let plat_ids = cfg.out_plat.split(",")
				for(let i in plat_ids){
					let all_key = "OUT_" + plat_ids[i]
					if(cfg_client[all_key] == null) cfg_client[all_key] = []

					cfg_client[all_key].push(gen_cli_cfg(cfg))
				}	
			}
		}

		let push_tag = cfg.push_tag
		if(push_tag != null && push_tag != ""){
			let tags = cfg.push_tag.split(",")
			for(let i = 0 ; i < tags.length; i++){
				if(cfg_push_tag[tags[i]] == null) cfg_push_tag[tags[i]] = [];

				cfg_push_tag[tags[i]].push(cfg.name)
			}
		}
	}
	
	for(let key in cfg_client){
		client.hset("cfg_toy_client", key, JSON.stringify(cfg_client[key]), function(err, ret){
			if(err) return console.log(err);
		});
	}

	client.del("cfg_toy_push_tag", function(err, ret){
		if(err) return console.log(err);

		for(let key in cfg_push_tag){
			client.hset("cfg_toy_push_tag", key, JSON.stringify(cfg_push_tag[key]), function(err, ret){
				if(err) return console.log(err);				
			});
		}
	});
}

module.exports = {
	init : init,
	deal : deal,
}