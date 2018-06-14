const express = require('express')
let router = express.Router();

router.get("/c2s_upload_log", function(req, res, next){
	res.send("{}")
	let pid = req.query.pid
	let op = req.query.op
	let log = null;
	if(op == "click_toy_type"){
		if(req.query.type == undefined) return;
		log = {
			suffix : "month",
			table : "t_click_type_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
				cnt : 1,
				position : "toy_list",
				type : req.query.type
			}
		}
	}
	else if(op == "click_mall_type"){
		if(req.query.type == undefined) return;
		log = {
			suffix : "month",
			table : "t_click_type_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
				cnt : 1,
				position : "mall",
				type : req.query.type
			}
		}
	}
	else if(op == "click_mall_item"){
		if(req.query.mall_id == undefined) return;
		log = {
			suffix : "month",
			table : "t_click_mall_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
				cnt : 1,
				mall_id : req.query.mall_id,
			}
		}
	}
	else if(op == "enter_h5_room"){
		if(req.query.toy_id == undefined) return;
		log = {
			suffix : "month",
			table : "t_enter_room_2d_log",
			model : "insert",
			values : {
				pid : pid,
	            toy_id : req.query.toy_id,
	            way : "Live",
	            enter_time : new Date().toLocaleString()
			}
		}	
	}
	else if(op == "click_toy_redbag_item"){
		if(req.query.redbag_id == undefined) return;
		log = {
			suffix : "month",
			table : "t_click_toy_redbag_item_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
	            redbag_id : req.query.redbag_id,
	            cnt : 1,
			}
		}
	}
	else if(op == "click_vr_ui"){
		log = {
			suffix : "month",
			table : "t_click_vr_ui_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
	            cnt : 1,
			}
		}		
	}
	else if(op == "open_paid_ui"){
		log = {
			suffix : "month",
			table : "t_open_paid_ui_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
	            cnt : 1,
			}
		}
	}
	else if(op == "open_pay_ui"){
		log = {
			suffix : "month",
			table : "t_open_pay_ui_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
	            cnt : 1,
			}
		}		
	}
	else if(op == "catch_toy_perspective"){
		if(req.query.plat_id == undefined) return;
		if(req.query.perspective == undefined) return;
		log = {
			suffix : "month",
			table : "t_catch_toy_perspective_log",
			model : "add_date_cnt",
			values : {
	            cnt : 1,
	            platform : req.query.plat_id,
				perspective : req.query.perspective,
			}
		}	
	}
	else if(op == "click_aim"){
		if(req.query.state == undefined) return;
		log = {
			suffix : "month",
			table : "t_click_aim_log",
			model : "add_date_cnt",
			values : {
				pid : pid,
	            cnt : 1,
	            state : req.query.state
			}
		}	
	}
	else if(op == "share_invite_code"){
		if(req.query.invite_code == undefined) return;
		if(req.query.where == undefined) return;
		log = {
			suffix : "month",
			table : "t_share_invite_code_log",
			model : "insert",
			values : {
				pid : pid,
	            invite_code : req.query.invite_code,
	            way : req.query.where
			}
		}
	}else if(op == "open_ddz_download_page"){
		if(req.query.position == undefined) return;
		log = {
			suffix : "month",
			table : "t_open_ddz_download_page_log",
			model : "insert",
			values : {
				pid : pid,
	            position: req.query.position,
			}
		}
	}
	if(log == null) return;
	g_App.dbcLogRedis.call("lpush", "dbc_log_list", JSON.stringify(log), function(err, ret){
		if(err) return console.log(err);
	});
});

router.get("/c2s_transtoDownload_log", function(req, res, next){
	res.send("{}")
	let pid = req.query.pid
	let pos = req.query.pos
	let log = {
		suffix : "month",
		table : "t_transtodownload_log",
		model : "insert",
		values : {
			pid : pid,
	        pos : pos
		}
	}
	g_App.dbcLogRedis.call("lpush", "dbc_log_list", JSON.stringify(log), function(err, ret){
		if(err) return console.log(err);
	});
});


module.exports = router;