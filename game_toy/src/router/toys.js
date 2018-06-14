const express = require('express')
let router = express.Router();

const http = require("http")

router.get("/get_home_banner", function(req, res, next){
	let position = req.query.position
	if(position == undefined) position = "home";
	let plat_id = req.query.plat_id
	if(plat_id == undefined) plat_id = "";
	g_App.gamecomRedis.evalsha("gy_get_home_data", 0, position, plat_id, function(err, ret){
		if(err) return console.log(err);
		res.send(ret);
	});
});

router.get("/get_mall_banner", function(req, res, next){
	g_App.gamecomRedis.call("hgetall", "cfg_mall_banner", function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : []
		}
		for(let id in ret){
			jret.data.push(ret[id])
		}
		res.json(jret);
	});
});

router.get("/get_sign_cfg", function(req, res, next){
	g_App.gamecomRedis.call("hgetall", "cfg_sign", function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : []
		}
		for(let id in ret){
			jret.data.push(ret[id])
		}
		res.json(jret);
	});
});


router.get("/get_toys_states", function(req, res, next){
	let plat_id = req.query.plat_id
	if(plat_id == undefined) plat_id = "";
	let position = req.query.position
	if(position != "vr") position = "";
	else position = "_vr";
	let now = new Date()
	let now_ts = now.getTime()
	let today_ts = now.getHours() * 3600 + now.getMinutes() * 60
	g_App.gamecomRedis.call("hgetall", "cfg_toy_client" + position, function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : JSON.parse(ret["ALL"])
		}
		let in_key = "IN_" + plat_id
		if(ret[in_key] != null) {
			jret.data = jret.data.concat(JSON.parse(ret[in_key]))
		}
		for(let id in ret){
			if(id.search("OUT_") == -1) continue;

			if(plat_id == "" || id.search(plat_id) == -1){
				jret.data = jret.data.concat(JSON.parse(ret[id]))
			}
		}
		if(ret["ShowTime"] != null){
			let time_data = JSON.parse(ret["ShowTime"])
			for(let idx in time_data){
				let jcfg = time_data[idx]
				if((jcfg.in_plat == "" || (plat_id != "" && jcfg.in_plat.search(plat_id) >= 0))
					&& (jcfg.out_plat == "" || jcfg.out_plat.search(plat_id) == -1)){
					if(now_ts < jcfg.begindate_ts || now_ts > jcfg.enddate_ts) continue;
					if(today_ts < jcfg.begintime_ts || today_ts > jcfg.endtime_ts) continue;
					jret.data.push({ cfg : jcfg.cfg })
				}
			}
		}
		g_App.gamecomRedis.call("hgetall", "cfg_toy_type_list", function(err, ret){
			if(err) return console.log(err)
			jret.type_list = []
			for(let id in ret){
				let jtype = JSON.parse(ret[id])		
				if((jtype.in_plat == "" || (plat_id != "" && jtype.in_plat.search(plat_id) >= 0))
					&& (jtype.out_plat == "" || jtype.out_plat.search(plat_id) == -1)){
					jret.type_list.push(ret[id])
				}
			}
			res.json(jret);
		});
	});
});
router.get("/get_toys_rooms", function(req, res, next){
	let toy_id = req.query.toy_id
	let pid = req.query.pid
	if (pid == undefined) pid = "";

	g_App.gamecomRedis.evalsha("gy_load_toys_room", 0, toy_id, pid, function(err, ret){
		if(err) return console.log(err);

		g_App.gameToyRedis.evalsha("gy_load_toy_rooms_state", 0, ret, function(err, ret){
			if(err) return console.log(err);
			res.send(ret);
		});
	});
});

router.get("/get_shop_goods", function(req, res, next){
	let show_type = req.query.show_type
	g_App.gamecomRedis.call("hgetall", "cfg_mall", function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : []
		}
		for(let id in ret){
			if(show_type == undefined)
				jret.data.push({ cfg : ret[id]})
			else{
				let jcfg = JSON.parse(ret[id])
				if(jcfg.show_type == show_type){
					jret.data.push({ cfg : ret[id]})	
				}
			}
		}
		if (show_type == undefined){
			g_App.gamecomRedis.call("hgetall", "cfg_mall_type_list", function(err, ret){
				if(err) return console.log(err)
				jret.type_list = []
				for(let id in ret){
					jret.type_list.push(ret[id])
				}
				res.json(jret);
			});
		}
		else
			res.json(jret);
	});
});

router.get("/get_3d_room_cfg", function(req, res, next){
	let toy_id = req.query.toy_id
	let game_type = req.query.game_type;
	g_App.gamecomRedis.call("hget", "cfg_rooms_3d", toy_id, function(err, ret){
		if(err) return console.log(err);
		let jret = {
			cfg : ret
		}
		res.json(jret);
	});

	let pid = req.query.pid
	let way = req.query.way
	if(pid == undefined || way == undefined) return;
	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_enter_room_vr_log",
		model : "insert",
		values : {
			pid : pid,
            toy_id : toy_id,
            way : way,
            enter_time : new Date().toLocaleString()
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});
	if(game_type){
		g_App.gamecomRedis.call("publish", "little_game_enter_log", 
            JSON.stringify({
                pid : pid,
	            toy_id : toy_id,
	            game_type : game_type,
	            enter_time : new Date().toLocaleString()
            }),
            function(err, ret){
            	if(err) return console.log(err);
            });
		let table = "t_first_login_" + game_type 
		g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
			suffix : "month",
			table : table,
			model : "insert_or_ignore",
			values : {
				player_id : pid,
				toy_id : toy_id,
	            save_firstlogin_time : new Date().toLocaleString()
			}
		}), function(err, ret){
			if(err) return console.log(err);
		});

	}
});

router.get("/get_toy_cfg_by_tid", function(req, res, next){
	let toy_id = req.query.toy_id;
	g_App.gamecomRedis.call("hget", "cfg_toy", toy_id, function (err, ret) {
		if (err) return console.log(err);
		let jret = {
			cfg : ret
		}
		res.json(jret);
	});
});

router.get("/get_h5_room_cfg_by_tid", function(req, res, next){
	let toy_id = req.query.toy_id;
	g_App.gamecomRedis.call("hget", "cfg_h5_room", toy_id, function (err, ret) {
		if (err) return console.log(err);
		let jret = {
			cfg : ret
		}
		res.json(jret);
	});
});

router.get("/get_toy_redbag", function(req, res, next){
	g_App.gamecomRedis.evalsha("gy_get_toy_redbag", 0, function(err, ret){
		if(err) return console.log(err);

		res.send(ret)
	});
});

router.get("/get_redbag_cfg", function(req, res, next){
	g_App.gamecomRedis.call("hgetall", "cfg_redbag", function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : []
		}
		for(let id in ret){
			let cfg = ret[id]
			jret.data.push({ cfg : cfg})
		}
		res.json(jret)
	});
});

router.get("/get_vip_cfg", function(req, res, next){
	g_App.gamecomRedis.call("hgetall", "cfg_vip", function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : []
		}
		for(let id in ret){
			jret.data.push(ret[id])
		}
		res.json(jret);
	});
});

router.get("/get_growth_cfg", function(req, res, next){
	g_App.gamecomRedis.call("hgetall", "cfg_growth", function(err, ret){
		if(err) return console.log(err);
		let jret = {
			data : []
		}
		for(let id in ret){
			jret.data.push(ret[id])
		}
		res.json(jret);
	});
});

router.get("/get_toy_catch_info", function(req, res, next){
	let toy_id = req.query.toy_id;
	if(toy_id == undefined) return;
	g_App.gameToyRedis.evalsha("gy_get_toy_catch_info", 0, toy_id, function(err, ret){
		if(err) return console.log(err);
		
		res.send(ret)
	});
});

router.get("/get_player_catch_log", function(req, res, next){
	let opid = req.query.opid
	if(opid == undefined) return;

	g_App.gameToyRedis.call("lrange", "self_toys_" + opid + "_catch_log" , 0, -1, function(err, ret){
		if(err) return console.log("get_player_catch_log", err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_indiana_history", function(req, res, next){
	let indiana_id = req.query.indiana_id
	if(indiana_id == undefined) return;	

	g_App.gamecomRedis.call("LRANGE", "indiana_" + indiana_id + "_history", 0, -1, function(err, ret){
		if(err) return console.log(err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

router.get("/c2s_get_invitingact_info", function(req, res, next){
	let pid = req.query.pid
	if(pid == undefined) return;	
	g_App.gamecomRedis.evalsha("gy_get_invitingact_info", 0, pid,function(err, ret){
		if(err) return console.log(err);
		res.send(ret)
	});

	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_enter_invitation_act_log",
		model : "add_date_cnt",
		values : {
			pid : pid,
			cnt : 1
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});
});

router.get("/c2s_get_game_redbag_info", function(req, res, next){
	let pid = req.query.pid
	if(pid == undefined) return;	

	g_App.gamecomRedis.evalsha("gy_get_game_redbag_info", 0, pid, function(err, ret){
		if(err) return console.log(err);
		res.send(ret)
	});
});

router.get("/c2s_get_game_room_cfg", function(req, res, next){
	let pid = req.query.pid
	let game_type = req.query.game_type
	if(pid == undefined) return;	
	if(game_type == undefined) return;	

	// g_App.gamecomRedis.call("hget","cfg_game_room_client", game_type, function(err, oret){
	// 	if(err) return console.log(err);
	// 	let ret = JSON.parse(oret)
	// 	let jret ={
	// 		describe:"",
	// 		roominfo:[]
	// 	}
	// 	for(var key in ret){
	// 		if(key == 0 ){
	// 			jret.describe = ret[key][0].describe
	// 		} else{
	// 			jret.roominfo.push(ret[key][0])
	// 		}
	// 	}
	// 	res.send(jret)
	// });

	let date = new Date();
	let ts = date.getTime();
	g_App.gameSdkRedis.call("hget", "map_dbid_pid", pid, function(err,ret){
		if(err) return console.log(err);
		g_App.ThirdSystem.push_cmd_to_player(ret, "get_user_hoodle", {
			pid : pid
		}, function(err, ret){
			if(err) return console.log(err);
			let hoodle = ret.hoodle;
			g_App.gamecomRedis.evalsha("get_game_room_cfg", 0, game_type, date.getHours(), Math.floor(date.getMinutes()/5), Number(ts), pid, hoodle/10,function(err, ret){
				if(err) return console.log(err);
				if(game_type == "ddz"){
					let jret = JSON.parse(ret)
					ret = JSON.stringify(jret)
				}
				res.send(ret)
			});
		});
		
	})
});


router.get("/get_toys_multi_rooms", function(req, res, next){
	let toy_id = req.query.toy_id
	let pid = req.query.pid
	if (pid == undefined) pid = "";
	g_App.gamecomRedis.call("hget", "cfg_toy_client_multi_vr", toy_id, function(err, ret){
		if(err) return console.log(err);
		let roomlist = []
		let jret = JSON.parse(ret)
		for(let i = 0;i<jret.length; i++){
			roomlist[i] = {}
			roomlist[i].name = jret[i].name;
			roomlist[i].room_id = jret[i].room_id;
			roomlist[i].toy_id = jret[i].toy_id;
			roomlist[i].price = jret[i].price;
			roomlist[i].img = jret[i].img;
		}
		res.send(roomlist);
	});
});

router.get("/get_3d_multi_room_cfg", function(req, res, next){
	let pid = req.query.pid
	let toy_id = req.query.toy_id
	let room_id = req.query.room_id
	let jret = {
		cfg : {},
		info : {}
	}
	g_App.gamecomRedis.evalsha("gy_get_3d_multi_room_cfg", 0, toy_id, room_id, function(err, ret){
		if(err) return console.log(err);
		if(!ret) return res.json({ ret_code : -1, ret_msg: '配置错误' })
		jret.cfg = ret
		//id为房间配置表中的id
		g_App.gamecomRedis.evalsha("gy_get_3d_multi_room_info", 0, pid, toy_id, room_id, JSON.parse(ret).id,function(err, posret){
			if(err) return console.log(err);
			if(posret < 0) return res.json({ ret_code : -2, ret_msg: 'err' })			
			let jposret = JSON.parse(posret)
			jret.info = posret
			res.json(jret);
		});
		
	});

});
module.exports = router;