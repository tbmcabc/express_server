
const express = require('express')
let router = express.Router();

router.post("/c2s_startH5_SD", function(req, res, next) {
	let pid = req.body.pid
	let ver = req.body.app_ver
	if(ver == undefined) ver = "";

	if (!g_configs.h5_portal) {
		return res.json({ ret_code: -1000, ret_msg: '暂时未开放，请稍后重试' });
	}

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) { 
			return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
		}

		if (sp == null) {
			return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });
		}

		let gold = sp.gold
		//sp.decGold(gold, '进入卡通抓娃娃扣费')

		let ts = g_App.get_ts()
		let r = Math.floor(Math.random() * 100000)
		let token = `${pid}_${ts}_${r}`

		g_App.gameH5Redis.evalsha("gy_start_h5_sd", 0, pid, gold, token, ts, 
			new Date().toLocaleString(), ver, sp.plat_id, function(err, ret) {
				
			if (err) return res.json({ ret_code : -3, ret_msg: '数据库错误！' });

			if (ret != null && ret != "") {				
				let jret = JSON.parse(ret)
				if (jret.ret_code < 0) {
					return res.json({ ret_code: jret.ret_code, ret_msg: jret.msg })
				}

				res.json({ ret_code: 0, url: jret.url, token: token })
			}
		});
	});
});

router.post("/c2s_H5_SD_back", function(req, res, next) {
	let pid = req.body.pid

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if (err) { 
			return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
		}

		if (sp == null) {
			return res.json({ ret_code: -2, ret_msg: '获取角色数据失败，请尝试重新进入游戏！' });
		}

		g_App.gameH5Redis.evalsha("gy_h5_sd_back", 0, pid, function(err, ret) {
			if (err) return res.json({ ret_code : -1, ret_msg: '数据库错误！' });
			res.json({ ret_code: 0 })
		});
	});
});

module.exports = router;