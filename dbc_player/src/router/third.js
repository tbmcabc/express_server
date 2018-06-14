const express = require('express')
let router = express.Router();

router.post("/c2s_third_authorization", function(req, res, next){
	let pid = req.body.pid

	let token = `${pid}_${g_App.get_ts()}`
	g_App.gamecomRedis.evalsha("dp_third_authorization", 0, pid, token, g_configs.sid, function(err, ret){
		if(err) return res.json({ ret_code : -1, ret_msg : "db service error!"});
		res.json({ ret_code : 0, token : token})
	});	
});


module.exports = router;