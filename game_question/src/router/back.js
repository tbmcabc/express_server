const express = require('express')
let router = express.Router();

router.post("/replay_to_player", function(req, res, next){
	let pid = req.body.pid
	let msg = req.body.msg
	if(pid == undefined || pid == "") return res.json({ ret_code : -2, ret_msg : "参数错误"});
	if(msg == undefined || msg == "") return res.json({ ret_code : -3, ret_msg : "参数错误"});

	g_App.gamequestionRedis.evalsha("gq_receive_replay", 0, pid, msg, function(err, ret){
		if(err) return res.json({ret_code : -1, ret_msg : "数据库错误"})

		res.json({ ret_code : 0})
	});

	g_App.gamecomRedis.call("publish", "send_xg_msg_to_player", JSON.stringify({ pid : pid, msg : "有一条来自客服的反馈，请在我的→客服中查看"}))
});


module.exports = router;