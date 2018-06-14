const express = require('express')
const util = require("util")
const crypto = require("crypto")
let router = express.Router();

router.post("/query_relieve_room", function(req, res, next){
	g_App.gameToyRedis.call("hgetall", "game_toy_continue_catch", function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}		
		let relieve_rooms = []		
		for(let id in ret){
			if(Number(ret[id]) >= 3){
				relieve_rooms.push(id)
			}
		}
		res.json({ ret_code : 0, relieve_rooms : relieve_rooms})
	});
});

router.post("/relieve_room", function(req, res, next){
	let rid = req.body.rid

	g_App.gameToyRedis.call("hdel", "game_toy_continue_catch", rid, function(err, ret){
		if(err){
			console.log(err);
			return res.json({ ret_code : -1, ret_msg : "数据库错误"})
		}

		res.json({ ret_code : 0})
	});
});

router.get("/query_server_state", function(req, res, next){
	g_App.gamecomRedis.call("hgetall", "game_server_control", function(err, ret){
		if(err) return console.log(err)

		g_App.gamecomRedis.call("hgetall", "cfg_global", function(err, ret_global){
			if(err) return console.log(err);

			res.json({ ret_code : 0, game_server_control : ret, cfg_global : ret_global})
		})
	});
});


router.post("/modify_gold", function(req, res, next){
	let pid = req.body.pid
	let gold = req.body.gold
	let why = req.body.why
	let type = req.body.type

	if(pid == undefined || pid == "") return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	let noSignStr = "";
	let sign = "";
	for (let key of Object.keys(req.body).sort()) {
		if (key == "sign") continue;
		noSignStr = noSignStr + util.format("%s=%s&",key,req.body[key]);
	}
	sign = req.body.sign
	noSignStr = noSignStr + util.format("key=%s",g_configs.SkuSecret);
	let md5 = crypto.createHash('md5');
	let selfSign = md5.update((new Buffer(noSignStr)).toString("utf8")).digest('hex').toLocaleLowerCase();
	if(selfSign != sign){
		console.log(noSignStr, sign, selfSign)
		return res.json({ret_code : -2, ret_msg :"sign is error"});
	}

	if(type != "add_gold" && type != "dec_gold"){
		return res.json({ret_code : -3, ret_msg :"type is error"});	
	}
	g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
		pid, type, 
		JSON.stringify({ gold : gold, way : why}), function(err, ret){
		if(err) return res.json({ret_code : -3, ret_msg :`数据库操作失败${err}`});

		res.json({ ret_code : 0})
	});
});

router.post("/modify_hoodle", function(req, res, next){
	let pid = req.body.pid
	let hoodle = req.body.hoodle
	let why = req.body.why
	let type = req.body.type

	if(pid == undefined || pid == "") return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	let noSignStr = "";
	let sign = "";
	for (let key of Object.keys(req.body).sort()) {
		if (key == "sign") continue;
		noSignStr = noSignStr + util.format("%s=%s&",key,req.body[key]);
	}
	sign = req.body.sign
	noSignStr = noSignStr + util.format("key=%s",g_configs.SkuSecret);
	let md5 = crypto.createHash('md5');
	let selfSign = md5.update((new Buffer(noSignStr)).toString("utf8")).digest('hex').toLocaleLowerCase();
	if(selfSign != sign){
		console.log(noSignStr, sign, selfSign)
		return res.json({ret_code : -2, ret_msg :"sign is error"});
	}

	if(type != "add_hoodle" && type != "dec_hoodle"){
		return res.json({ret_code : -3, ret_msg :"type is error"});	
	}
	g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
		pid, type, 
		JSON.stringify({ hoodle : hoodle, way : why}), function(err, ret){
		if(err) return res.json({ret_code : -3, ret_msg :`数据库操作失败${err}`});

		res.json({ ret_code : 0})
	});
});

module.exports = router;