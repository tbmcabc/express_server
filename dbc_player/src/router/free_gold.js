//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.get("/c2s_get_free_gold", function(req, res, next){
	let pid = req.query.pid
	let now_date = new Date()

	let today_ts = now_date.getHours() * 3600 + now_date.getMinutes() * 60 + now_date.getSeconds()
	let now_date_str = now_date.toLocaleDateString()
	let now_ts = g_App.get_ts()

	g_App.gamecomRedis.evalsha("gy_check_free_gold", 0, pid, 
		today_ts, now_ts, now_date_str, 
		"Enter", function(err, ret){
		if (err) { 
			return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
		}

		res.send(ret)
	});
});

router.post("/c2s_get_free_gold", function(req, res, next){
	let pid = req.body.pid
	
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}

		let now_date = new Date()

		let today_ts = now_date.getHours() * 3600 + now_date.getMinutes() * 60 + now_date.getSeconds()
		let now_date_str = now_date.toLocaleDateString()
		let now_ts = g_App.get_ts()

		g_App.gamecomRedis.evalsha("gy_check_free_gold", 0, pid, 
			today_ts, now_ts, now_date_str, 
			"Get", function(err, ret){
			if (err) { 
				return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
			}

			let jret = JSON.parse(ret)
			if (jret.ret_code == 0){
				sp.incGold(jret.real_get, "金币雨活动", "");
			}
			res.send(ret)
		});
	});
});

module.exports = router;