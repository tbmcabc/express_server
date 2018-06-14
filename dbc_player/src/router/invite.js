const express = require('express')
let router = express.Router();


router.post("/c2s_input_invite_code", function(req, res, next){
	let pid = req.body.pid
	let invite_code = req.body.invite_code
	if (invite_code == undefined) return res.json({ ret_code : -1000, ret_msg : "params is lack"});

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});
		if(sp == null) return res.json({ ret_code : -2, ret_msg : "player is not online"})

		g_App.gameToyRedis.evalsha("gy_input_invite_code", 0, pid, invite_code, sp.nick_name, sp.head_img, function(err, ret){
			if(err) { 
				console.log("gy_input_invite_code", err)
				return res.json({ ret_code : -1, ret_msg : "db service error!"});
			}

			let jret = JSON.parse(ret)

			if(jret.gold != null){
				sp.incGold(jret.gold, "输入邀请码");
			}

			//充值邀请送娃娃
            let message = {pid: jret.owner_toy}

            g_App.gamecomRedis.call("PUBLISH","change_invitation_invite_data", JSON.stringify(message), function(err,ret){
                if(err) return console.log(err);
            });

			if(jret.owner != null){
				g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
					jret.owner, "add_gold", 
					JSON.stringify({ gold : jret.owner_gold, way : "好友输入邀请码", tips : "分享好友成功"}), function(err, ret){
					if(err) return console.log("c2s_input_invite_code->gy_add_player_cmd", err);
				});

			}
			res.send(ret)
		});	
	});
	
});

router.post("/c2s_get_invite_redbag", function(req, res, next){
	let pid = req.body.pid
	let mid = req.body.mid

	g_App.playerManager.getPlayerCacheByID(pid, function(err, sp) {
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});
		if(sp == null) return res.json({ ret_code : -2, ret_msg : "player is not online"})

		g_App.gameToyRedis.evalsha("gy_get_invite_redbag", 0, pid, mid, function(err, ret){
			if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});
			let jret = JSON.parse(ret)
			if(jret.redbag != null){
				sp.incRedbag(Number(jret.redbag), "提取邀请红包", ret)
			}
			res.send(ret)
		});	
	});

});
module.exports = router;