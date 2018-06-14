

exports.reloadcmds = function () {
	delete require.cache[require.resolve("./cmds")]
	
	global.g_cmds = require("./cmds")
	console.log(`[${new Date().toLocaleString()}] reloadcmds success`)	
}

exports.node = function(args){
	let js = args[0]
	eval(js)
}

exports.update_jd_cards = function(args){

	let str_sql = "select * from t_jd where pid = 0;"

	g_App.mysqlCli.query(str_sql, [], function(err, ret){
		let ret_cards = {}
		
		for(let idx in ret){
			let pwd = ret[idx].card_pwd
			let price = ret[idx].price
			if(ret_cards[price] == null){
				ret_cards[price] = []
			}
			ret_cards[price].push(pwd)
		}

		console.log(ret_cards)

		g_App.gamecomRedis.evalsha("gy_update_jd_cards", 0, JSON.stringify(ret_cards), function(err, ret){
			if(err) return console.log(err);
			console.log(ret)
		});
	});
}

exports.update_qb_cards = function(args){

	let str_sql = "select * from t_qb where pid = 0;"

	g_App.mysqlCli.query(str_sql, [], function(err, ret){
		let ret_cards = {}
		
		for(let idx in ret){
			let pwd = ret[idx].card_pwd
			let price = ret[idx].price
			if(ret_cards[price] == null){
				ret_cards[price] = []
			}
			ret_cards[price].push(pwd)
		}

		console.log(ret_cards)

		g_App.gamecomRedis.evalsha("gy_update_qb_cards", 0, JSON.stringify(ret_cards), function(err, ret){
			if(err) return console.log(err);
			console.log(ret)
		});
	});
}

exports.reload_cfg_global = function(args){
	g_App.gamecomRedis.call("publish", "reload_cfg_global", "", function(err, ret){
		if(err) return console.log(err);
	});
}