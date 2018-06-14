const express = require('express')
let router = express.Router();
const crypto = require("crypto")

router.get("/c2s_join_ddz_room_ex", function(req, res, next){
	// let pid = req.body.pid;
	// let room_id = req.body.gear;
	let pid = req.query.pid;
	let room_id = req.query.gear;
	if(room_id == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });

		g_App.gamecomRedis.evalsha("join_ddz_room", 0, pid, room_id, sp.hoodle, new Date().toLocaleString(), function(err, ret){
			if(err) return console.log(err);
			if(ret == -1) return res.json({ret_code: -3, ret_msg:"没有找到相应配置" })
				
			if(ret == -2) return res.json({ret_code: -4, ret_msg:"携带硬币不符合进入要求" })

			let str = 'pid='+ pid + '&dbid=' + sp.dbid + '&ts=' + g_App.get_ts()
			let md5 = crypto.createHash('md5');
			let sign = md5.update((new Buffer(str)).toString("utf8")).digest('hex').toLocaleLowerCase();

			let pinfo = {
				pid: pid,
				dbid: sp.dbid,
				hoodle: sp.hoodle * 10,
				game_redbag: sp.game_redbag,
				nick_name: sp.nick_name,
				sex: sp.sex,
				head_img: sp.head_img,
			}

			g_App.gamecomRedis.call("hget", "ddz_pid_sign_map", pid, function(err, ret){
				if(err) return console.log(err)
				if(ret){
					g_App.gamecomRedis.call("hdel", "player_ddz_sign", ret)
				}

				g_App.gamecomRedis.call("hset", "ddz_pid_sign_map", pid, sign)
				g_App.gamecomRedis.call("hset", "player_ddz_sign", sign, JSON.stringify(pinfo))
			})
			res.json({ret_code: 0, sign: sign, room_id:room_id})

		});
	});

});

router.post("/c2s_join_ddz_room", function(req, res, next){
	let pid = req.body.pid;
	let room_id = req.body.gear;
	if(room_id == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null) return res.json({ret_code: -2, ret_msg : "player is not online" });

		g_App.gamecomRedis.evalsha("join_ddz_room", 0, pid, room_id, sp.hoodle, new Date().toLocaleString(), function(err, ret){
			if(err) return console.log(err);
			if(ret == -1) return res.json({ret_code: -3, ret_msg:"没有找到相应配置" })
				
			if(ret == -2) return res.json({ret_code: -4, ret_msg:"携带硬币不符合进入要求" })

			let str = 'pid='+ pid + '&dbid=' + sp.dbid + '&ts=' + g_App.get_ts()
			let md5 = crypto.createHash('md5');
			let sign = md5.update((new Buffer(str)).toString("utf8")).digest('hex').toLocaleLowerCase();

			let pinfo = {
				pid: pid,
				dbid: sp.dbid,
				hoodle: sp.hoodle * 10,
				game_redbag: sp.game_redbag,
				nick_name: sp.nick_name,
				sex: sp.sex,
				head_img: sp.head_img,
			}

			g_App.gamecomRedis.call("hget", "ddz_pid_sign_map", pid, function(err, ret){
				if(err) return console.log(err)
				if(ret){
					g_App.gamecomRedis.call("hdel", "player_ddz_sign", ret)
				}

				g_App.gamecomRedis.call("hset", "ddz_pid_sign_map", pid, sign)
				g_App.gamecomRedis.call("hset", "player_ddz_sign", sign, JSON.stringify(pinfo))
			})
			res.json({ret_code: 0, sign: sign, room_id:room_id})

		});
	});

});

module.exports = router;