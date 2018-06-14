const express = require('express')
let router = express.Router();
const http = require("http")

router.post("/catch_result", function(req, res, next){ 
	let txret = req.body
	g_App.log_catch.info(JSON.stringify(txret))
	let rt = (txret.Result == true ? 1 : 0);
	g_App.gameToyRedis.evalsha("gy_get_catch_result", 0, txret.PlayId, rt, new Date().toLocaleString(), g_App.get_ts(), function(err, ret){
		if(err) return console.log(err);
		if(ret == null) return;
		if(rt == 0) return;
		let jret = JSON.parse(ret)
		g_App.gamecomRedis.evalsha("gy_get_catch_result", 0, jret.pid, jret.rid, jret.nick_name, jret.head_img, function(err, ret){
			if(err) return console.log(err);
		});

		let jcfg = JSON.parse(jret.cfg)
		if(jcfg.auto_type != null && jcfg.auto_type != ""){
			g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
				jret.pid, "auto_add", 
				JSON.stringify({ 
				  auto_type : jcfg.auto_type,
				  auto_val : jcfg.auto_val,
				  way : `抓中${jcfg.name}`,
				  toy : JSON.stringify({name : jcfg.name , img : jcfg.img, playId : txret.PlayId})
				}), 
				function(err, ret){
				if(err) return console.log(err)
			});	
		}
	});

	res.json({
		ActionStatus: "OK",
    	ErrorInfo: "", 
    	ErrorCode: 0
	})
});

router.get("/catch_result", function(req, res, next){
	let PlayId = req.query.PlayId
	let rt = req.query.Result
	rt = 1;
	g_App.gameToyRedis.evalsha("gy_get_catch_result", 0, PlayId, rt, new Date().toLocaleString(), g_App.get_ts(), function(err, ret){
		if(err) return console.log(err);
		if(ret == null) return;
		//if(rt == 1) return;
		let jret = JSON.parse(ret)
		g_App.gamecomRedis.evalsha("gy_get_catch_result", 0, jret.pid, jret.rid, jret.nick_name, jret.head_img, function(err, ret){
			if(err) return console.log(err);
		});

		let jcfg = JSON.parse(jret.cfg)
		if(jcfg.auto_type != null && jcfg.auto_type != ""){
			g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, 
				jret.pid, "auto_add", 
				JSON.stringify({ 
				  auto_type : jcfg.auto_type,
				  auto_val : jcfg.auto_val,
				  way : `抓中${jcfg.name}`,
				  toy : JSON.stringify({name : jcfg.name , img : jcfg.img, playId : PlayId })
				}), 
				function(err, ret){
				if(err) return console.log(err)
			});	
		}
	});

	res.json({
		ActionStatus: "OK",
    	ErrorInfo: "", 
    	ErrorCode: 0
	})
});

module.exports = router;