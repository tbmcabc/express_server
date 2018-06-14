const express = require('express')
let router = express.Router();

router.post("/c2s_startIndianaVr", function(req, res, next) {
	let pid = req.body.pid
	let indiana_id = req.body.indiana_id

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err)  return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
	
		if (sp == null) return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });

		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
		let fake = sp.gold_pay > 0 ? "0" : "1";
		g_App.gamecomRedis.evalsha("dp_check_indiana_cfg", 0, indiana_id, today_ts, fake, function(err, ind_ret){
			if(err) return console.log(err);

			if(ind_ret == -1) return res.json({ ret_code: -3, ret_msg: '开始游戏失败，不在活动时间内' });

			if(ind_ret == -2) return res.json({ ret_code: -4, ret_msg: '开始游戏失败，号码已经被抓完了\n请等待下次活动开始' });

			let jind_ret = JSON.parse(ind_ret)
			let jtoy_cfg = JSON.parse(jind_ret.cfg)

			if (jtoy_cfg.price == null || jtoy_cfg.price == 0 ) return res.json({ ret_code : -5, ret_msg: '配置数据错误！' });

			if (sp.decGold(Number(jtoy_cfg.price), "夺宝抓娃娃") == false) {
				g_App.gamecomRedis.evalsha("dp_begin_indiana", 0, pid, indiana_id, "", jind_ret.luck, fake, function(err, ret){
					if(err) return console.log(err);
				});
				return res.json({ ret_code : -6, ret_msg: '开始游戏失败，您的金币不足！' });
			}

			let playId = `${pid}_${indiana_id}_${g_App.get_ts()}`
			let force = g_configs.catch_vr_force;
			g_App.gamecomRedis.evalsha("dp_begin_indiana", 0, pid, indiana_id, playId, jind_ret.luck, fake, function(err, ret){
				if(err) return console.log(err);

				res.json({ ret_code: 0, 
					token: playId, 
					gold: sp.gold, 
					force: force, 
					result: 1,
					ret_share_tips : `${sp.nick_name}获得中大奖的机会，你也来试试吧！`,
					ret_fail_tips : "意外！竟然没有抓中娃娃，请再接再厉。",
					ret_succ_tips : `恭喜你获得幸运号码${jind_ret.luck}\n请退出房间查看。`
				})
			});
		});
	});
});

router.post("/c2s_endIndianaVr", function(req, res, next) {
	let pid = req.body.pid
	let indiana_id = req.body.indiana_id
	let playId = req.body.playId
	let succ = req.body.succ

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
	
		if (sp == null) return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });

		let now = new Date()
		let today_ts = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
		g_App.gamecomRedis.evalsha("dp_end_indiana", 0, pid, playId, indiana_id, function(err, ret){
			if(err) return console.log(err);

			if(ret < 0 || succ != 1) return res.json({ ret_code : ret });

			let jret = JSON.parse(ret)

			g_App.gamecomRedis.evalsha("ga_get_indiana_luck", 0, pid, indiana_id, 
				now.toLocaleDateString(),
				today_ts, 
				sp.nick_name,
				sp.head_img,
				now.toLocaleString(),
				jret.fake,
				function(err, ret){
					if(err) return console.log(err);
					if(ret < 0) return res.json({ ret_code : ret });

					res.json({ ret_code : 0 })

					sp.sendMsg({ op : "get_indiana_luck" })
			});
		});
	});
});

module.exports = router;