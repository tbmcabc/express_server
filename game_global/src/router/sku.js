const express = require('express')
const crypto = require("crypto")
const util = require("util")
let router = express.Router();

router.post("/fetch_order_notify", function(req, res, next){
	let orderid = req.body.orderid
	let pid = req.body.pid
	if(orderid == undefined || pid == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	let noSignStr = "";
	let sign = "";
	for (let key of Object.keys(req.body).sort()) {
		if (key == "sign") continue;
		noSignStr = noSignStr + util.format("%s=%s&",key,req.body[key]);
	}
	sign = req.body.sign
	noSignStr = noSignStr + util.format("key=%s",g_configs.SkuSecret);
	let md5 = crypto.createHash('md5');
	let selfSign = md5.update((new Buffer(noSignStr)).toString("utf8")).digest('hex').toLocaleLowerCase();
	if(selfSign != sign){
		console.log(noSignStr, sign, selfSign)
		return res.json({ret_code : -2, ret_msg :"sign is error"});
	}
	let values = {}
	for(let key in req.body){
		if(key != "orderid" && key != "pid" && key != "state" && key != "taobao_orderId" && key != "taobao_waybillId" && key != "sign" && key != "discript"){
			return res.json({ ret_code : -3, ret_msg : "非法参数"});
		}
		if(key == "state" || key == "taobao_orderId" || key == "taobao_waybillId" || key == "discript"){
			values[key] = req.body[key]
		}
	}

	if(req.body.state == "1"){
		g_App.gamecomRedis.call("publish", "send_xg_msg_to_player", JSON.stringify({ pid : pid, msg : "您的提取申请已经通过审核，物流小哥正在准备打包快递"}), function(err, ret){
			if(err) return console.log(err);
		});
	}
	else if(req.body.state == "2"){
		g_App.gamecomRedis.call("publish", "send_xg_msg_to_player", JSON.stringify({ pid : pid, msg : "您提取的物品已经发出，请关注客户端的我的娃娃→提取记录中的运单号查询具体物流情况"}), function(err, ret){
			if(err) return console.log(err);
		});
	}
	
	g_App.gameToyRedis.evalsha("gy_fetch_order_notify", 0, orderid, pid, JSON.stringify(values), function(err, ret){
		if(err) return res.json({ ret_code : -4, ret_msg : "数据库错误"});
		if(ret < 0) return res.json({ ret_code : -5, ret_msg : "订单号不存在"});

		res.json({ ret_code : 0})
	});
});

router.post("/modify_fetch_address", function(req, res, next){
	let orderids = req.body.orderids
	let pid = req.body.pid
	if(orderids == undefined || pid == undefined) return res.json({ ret_code : -1, ret_msg : "缺少参数"});

	let noSignStr = "";
	let sign = "";
	for (let key of Object.keys(req.body).sort()) {
		if (key == "sign") continue;
		noSignStr = noSignStr + util.format("%s=%s&",key,req.body[key]);
	}
	sign = req.body.sign
	noSignStr = noSignStr + util.format("key=%s",g_configs.SkuSecret);
	let md5 = crypto.createHash('md5');
	let selfSign = md5.update((new Buffer(noSignStr)).toString("utf8")).digest('hex').toLocaleLowerCase();
	if(selfSign != sign){
		console.log(noSignStr, sign, selfSign)
		return res.json({ret_code : -2, ret_msg :"sign is error"});
	}
	let values = {}
	for(let key in req.body){
		if(key != "orderids" && key != "pid" 
			&& key != "receiverPhone"
			&& key != "receiverName"
			&& key != "receiverProvince"
			&& key != "receiverCity"
			&& key != "receiverArea"
			&& key != "receiverAddress"
			&& key != "sign"){
			return res.json({ ret_code : -3, ret_msg : "非法参数"});
		}
		if(key == "receiverPhone"
			|| key == "receiverName"
			|| key == "receiverProvince"
			|| key == "receiverCity"
			|| key == "receiverArea"
			|| key == "receiverAddress"){
			values[key] = req.body[key]
		}
	}

	g_App.gameToyRedis.evalsha("gy_fetch_modify_address", 0, orderids, pid, JSON.stringify(values), function(err, ret){
		if(err) return res.json({ ret_code : -4, ret_msg : "数据库错误"});
		if(ret < 0) return res.json({ ret_code : -5, ret_msg : "包含不存在的订单号"});

		res.json({ ret_code : 0})
	});
});

module.exports = router;