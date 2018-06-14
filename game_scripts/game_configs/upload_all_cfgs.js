require("../config")
const UploadCfgEvent = require("./upload_cfg_event")

const redis = require('redis')
const fs = require("fs")

global.g_UploadCfgEvent = new UploadCfgEvent();

global.CloneObject = function(source) { 
    let ret={};
    for (let key in source) {
        ret[key] = typeof(source[key])==='object' ? CloneObject(source[key]): source[key]
     } 
   return ret; 
}

function uploadConfig(client, filename, key, deal_mod){
	let buffer = fs.readFileSync(filename);

	let newBuffer = Buffer.alloc(buffer.length - 3)
	buffer.copy(newBuffer, 0, 3)	

	let content = newBuffer.toString();

	let lines = content.split("\r\n")
	
	client.del(key, function(err, ret){
		if(err) return console.log(err);
		let upload_cfg = function(){
			console.log("upload cfgs "+ filename)
			let keys = null
			let cfgs = []
			for (let idx in lines) {
				let str = lines[idx]
				if(str == "") continue;
				if(str.substr(0, 1) == "#"){
					keys = str.split("\t");
					keys[0] = keys[0].substr(1)
				}
				else{
					let values = str.split("\t");
					if(keys==null) continue;
					let cfg = {}
					for (let i = 0; i < keys.length; i++) {
						cfg[keys[i]] = values[i]
					}
					if (key != "__"){
						client.hset(key, values[0], JSON.stringify(cfg), function(err, ret){
							if (err) return console.log(err)
						});
					}
					cfgs.push(cfg)
				}
			}
			if(deal_mod != null && deal_mod.deal != null) deal_mod.deal(client, cfgs);
		}

		if(deal_mod != null && deal_mod.init != null)
		 	deal_mod.init(client, function(err){
		 		if(err) return console.log(err);
		 		upload_cfg()	
		 	});
		else
			upload_cfg()
	});
}

function uploadAllConfigs(client) {
	uploadConfig(client, "configs/toy.txt", "cfg_toy", require("./cfg_toy"))
	uploadConfig(client, "configs/toy_room.txt", "cfg_toy_room",require("./cfg_toy_room"))
	uploadConfig(client, "configs/mall.txt", "cfg_mall")
	uploadConfig(client, "configs/rooms_3d.txt", "cfg_rooms_3d", require("./cfg_rooms_3d"))
	uploadConfig(client, "configs/luck_wall.txt", "cfg_luck_wall")
	uploadConfig(client, "configs/home_banner.txt", "cfg_home_banner")
	uploadConfig(client, "configs/robot.txt", "cfg_robot")
	uploadConfig(client, "configs/robot_toy.txt", "cfg_robot_toy")
	uploadConfig(client, "configs/mall_banner.txt", "cfg_mall_banner")
	uploadConfig(client, "configs/pay.txt", "cfg_pay", require("./cfg_pay"))
	uploadConfig(client, "configs/toy_redbag.txt", "cfg_toy_redbag", require("./cfg_toy_redbag"))
	uploadConfig(client, "configs/toy_type_list.txt", "cfg_toy_type_list")
	uploadConfig(client, "configs/toy_banner.txt", "cfg_toy_banner")
	uploadConfig(client, "configs/mall_type_list.txt", "cfg_mall_type_list")
	uploadConfig(client, "configs/toy_vr_banner.txt", "cfg_toy_vr_banner")
	uploadConfig(client, "configs/redbag.txt", "cfg_redbag")
	uploadConfig(client, "configs/paid.txt", "cfg_paid")
	uploadConfig(client, "configs/sign.txt", "cfg_sign")
	uploadConfig(client, "configs/h5_room.txt", "cfg_h5_room")
	uploadConfig(client, "configs/push_tag.txt", "cfg_push_tag")
	uploadConfig(client, "configs/free_gold.txt", "__", require("./cfg_free_gold"))
	uploadConfig(client, "configs/push.txt", "__", require("./cfg_push"))
	uploadConfig(client, "configs/global.txt", "__", require("./cfg_global"))
	uploadConfig(client, "configs/indiana.txt", "__", require("./cfg_indiana"))
	uploadConfig(client, "configs/invitingact.txt", "cfg_invitingact")
	uploadConfig(client, "configs/reversalact.txt", "cfg_reversalact")
	uploadConfig(client, "configs/game_redbag.txt", "cfg_game_redbag")
	uploadConfig(client, "configs/trinity.txt", "cfg_trinity", require("./cfg_room_trinity"))
	uploadConfig(client, "configs/trinity_gear.txt", "__", require("./cfg_trinity_gear"))
	uploadConfig(client, "configs/rushhour.txt", "cfg_rushhour", require("./cfg_room_rushhour"))
	uploadConfig(client, "configs/rushhour_gear.txt", "__", require("./cfg_rushhour_gear"))
	uploadConfig(client, "configs/littlegame_rate_gear.txt", "__", require("./cfg_littlegame_rate_gear"))
	uploadConfig(client, "configs/reversalact_gear.txt", "__", require("./cfg_reversalact_gear"))
	uploadConfig(client, "configs/rooms_3d_multi.txt", "cfg_rooms_3d_multi", require("./cfg_rooms_3d_multi"))
	uploadConfig(client, "configs/cfg_room_ddz.txt", "cfg_room_ddz", require("./cfg_room_ddz"))
	uploadConfig(client, "configs/random_people_ddz.txt", "cfg_random_people_ddz")
	
	
	//uploadConfig(client, "configs/vip.txt", "cfg_vip")
	//uploadConfig(client, "configs/growth.txt", "cfg_growth")
	
	console.log("upload all configs success!")
}

let cfg = g_configs.redis_configs["game_com"]
let redis_client = redis.createClient(cfg);	
redis_client.on('error',function(err){
    console.log(err)
});

redis_client.on('ready',function(err){

});

redis_client.on('connect',function(){
	if(cfg.auth != null){
		redis_client.auth(cfg.auth, function(err, ret){
			uploadAllConfigs(redis_client)		
		});
	}
  else{
      uploadAllConfigs(redis_client)	
  }
});

setTimeout(function(){
	console.log("exit")
	process.emit("exit", function() {})	
}, 5000)