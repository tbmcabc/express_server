//娃娃炼金功能模块
const express = require('express')
let router = express.Router();

router.post("/c2s_growth_to_score", function(req, res, next){
	let pid = req.body.pid

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});

		if(sp == null){
			return res.json({ret_code : 1, ret_msg : "player is not online" });
		}
		let growth_level = sp.growth_level + 1
		g_App.gamecomRedis.call("hget", "cfg_growth", growth_level, function(err, ret){
			if(err) return console.log(err);
			if(ret == null) return res.json({ret_code : 2, ret_msg : "没有找到配置" });
			let jret = JSON.parse(ret)

			if(sp.decGrowth(jret.growth, "成长值奖励", "") == false){
				return res.json({ret_code : 2, ret_msg : "成长值不足，不能领取奖励" });	
			}
			sp.growth = 0
			sp.growth_level = growth_level
			sp.incScore(jret.score, "成长值奖励", JSON.stringify({ name : "成长等级" + growth_level + "奖励", img : jret.img}))

			res.json({ ret_code : 0, ret_msg : "领取成功，获得"+jret.score+"积分奖励"})
		});
	});
});


module.exports = router;