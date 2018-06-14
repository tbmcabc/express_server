//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.post("/c2s_sign", function(req, res, next){
	let pid = req.body.pid

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}
		let now_date = new Date().toLocaleDateString()
		if(sp.sign_date == now_date){
			return res.json({ret_code : -2, ret_msg : "今日已经签到" });	
		}
		let sign_cnt = sp.sign_cnt + 1
		g_App.gamecomRedis.call("hget", "cfg_sign", sign_cnt, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

			if(ret == null) return res.json({ ret_code : -1, ret_msg : "加载配置失败"});

			let jret = JSON.parse(ret)
			let gold = Number(jret.gold)
			sp.sign_cnt = sp.sign_cnt + 1
			sp.sign_date = now_date
			sp.incGold(gold, "签到奖励", "");

			sp.share_sign_date = ""

			res.json({ ret_code : 0, ret_msg : "签到成功,获得"+gold+"金币"});
		});
	});
});

router.post("/c2s_sign_share", function(req, res, next){
	let pid = req.body.pid
	res.json({ ret_code : 0});
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return;
		if(sp == null) return ;
		if(sp.share_sign_date != "") return;
		g_App.gamecomRedis.call("hget", "cfg_sign", sp.sign_cnt, function(err, ret){
			if(err) return;
			if(ret == null) return;
			sp.share_sign_date = new Date().toLocaleDateString()
			let jret = JSON.parse(ret)
			let gold = Number(jret.share)
			sp.incGold(gold, "签到分享奖励", sp.share_sign_date);
			
			sp.sendMsgBox("分享成功,获取"+gold+"金币奖励！")
		});
	});

	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_share_log",
		model : "insert",
		values : {
			pid : pid,
			way : "SignShare"
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});
});

router.post("/c2s_share", function(req, res, next){
	let pid = req.body.pid
	res.json({ret_code : 0 })
	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return;
		if(sp == null) return;
		let now_date = new Date().toLocaleDateString()
		if(sp.share_date == now_date) return;
		sp.share_date = now_date

		sp.incGold(10, "分享奖励", now_date)
		
		sp.sendMsgBox("分享成功,获取10金币奖励！")
	});

	let way = req.body.way
	if(way == undefined) way = "NotGold";
	g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
		suffix : "month",
		table : "t_share_log",
		model : "insert",
		values : {
			pid : pid,
			way : way
		}
	}), function(err, ret){
		if(err) return console.log(err);
	});
});

module.exports = router;