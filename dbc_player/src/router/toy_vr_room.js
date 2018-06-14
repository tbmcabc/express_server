const express = require('express')
let router = express.Router();

router.post("/c2s_report_pos", function(req, res, next){	
	let pid = req.body.pid
	let rid = req.body.rid
	let toy_id = req.body.toy_id
	let dollposarr = req.body.dollposarr
	let clawpos = req.body.clawpos	
	let clawRootpos = req.body.clawRootpos	

	if (pid == undefined) return res.json({ ret_code : -1, ret_msg:"pid参数错误" } )
	toy_id = 1
	rid = 1
	g_App.gamecomRedis.evalsha("dp_update_vr_rooms", 0, pid, toy_id, rid, dollposarr, clawpos, clawRootpos, function(err, ret){
		if(err) return console.log(err);
		if (ret == -1){
			res.json({ ret_code : -1, ret_msg:"err" } )
		}else{
			let jret = JSON.parse(ret)
			jret.op = "update_multi_pos"
			g_App.gamecomRedis.call("publish", "send_msg_to_players", JSON.stringify({
                pids : jret.players,
                json : JSON.stringify(jret)
            }),
            function(err, ret){});

			res.json({ ret_code : 0})
		}
		
	})
});

router.post("/c2s_notifyCatching", function(req, res, next){
	let pid = req.body.pid
	let rid = req.body.rid
	let toy_id = req.body.toy_id
	let clawRootpos = req.body.clawRootpos	
	let posdown = req.body.posdown
	let target = req.body.target
	let result = req.body.result	

	if (pid == undefined) return res.json({ ret_code : -1, ret_msg:"pid参数错误" } )
	toy_id = 1
	rid = 1
	g_App.gamecomRedis.evalsha("dp_update_vr_rooms_catch", 0, pid, toy_id, rid, clawRootpos, posdown, target, function(err, ret){
		if(err) return console.log(err);
		if (ret == -1){
			res.json({ ret_code : -1, ret_msg:"err" } )
		}else{
			let jret = JSON.parse(ret)
			jret.op = "update_multi_pos"
			g_App.gamecomRedis.call("publish", "send_msg_to_players", JSON.stringify({
                pids : jret.players,
                json : JSON.stringify(jret)
            }),
            function(err, ret){});

			res.json({ ret_code : 0})
		}
		
	})
});



module.exports = router;