const express = require('express')
let router = express.Router();

router.post("/c2s_upload_question", function(req, res, next){
	next()

	let pid = req.body.pid
	let msg = req.body.msg
	if(pid == undefined || pid == "") return;
	if(msg == undefined || msg == "") return;
	let log = {
		table : "t_question_log",
		model : "insert",
		values : {
			pid : pid,
			wenti : msg,
		}
	}
	g_App.dbcLogRedis.call("lpush", "dbc_log_list", JSON.stringify(log), function(err, ret){
		if(err) return console.log(err);
	});
});

router.post("/c2s_enter_h5_page", function(req, res, next){
	next()

	let plat_id = req.body.plat_id
	if(plat_id == undefined || plat_id == "") return;
	let log = {
		suffix : "month",
		table : "t_enter_h5_page_log",
		model : "add_date_cnt",
		values : {
			platform : plat_id,
			cnt : 1
		}
	}
	g_App.dbcLogRedis.call("lpush", "dbc_log_list", JSON.stringify(log), function(err, ret){
		if(err) return console.log(err);
	});
});

router.get("/c2s_get_reply", function(req, res, next){
	let pid = req.query.pid
	
	g_App.gamequestionRedis.call("LRANGE", "game_replay_" + pid, 0, -1, function(err, ret){
		if(err) return console.log("c2s_get_reply", err);
		let jret = {
			logs : ret
		}
		res.json(jret);
	});
});

module.exports = router;