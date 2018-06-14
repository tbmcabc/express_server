

exports.reloadcmds = function () {
	delete require.cache[require.resolve("./cmds")]
	
	global.g_cmds = require("./cmds")
	console.log(`[${new Date().toLocaleString()}] reloadcmds success`)	
}

exports.node = function(args){
	let js = args[0]
	eval(js)
}


exports.set_prob = function(args){
	console.log(args)
	let rid = Number(args[0])
	let ProbNumerator = Number(args[1])
	let ProbDenominator = Number(args[2])
	console.log(rid, ProbNumerator, ProbDenominator)
	g_App.ToyAPI.set_prob(rid, ProbNumerator, ProbDenominator)
}

exports.add_gold = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		if(sp == null) return console.log("没有找到玩家数据");
		sp.incGold(args[1], "GM添加金币", "")
	});	
}

exports.add_score = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		if(sp == null) return console.log("没有找到玩家数据");
		sp.incScore(args[1], "平台补偿", JSON.stringify({name : "平台补偿", img : "http://zww.ooxxp.com/zwwimg/jifenbuchang.png"}))
	});	
}
exports.set_gold_pay = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		if(sp == null) return console.log("没有找到玩家数据");
		sp.gold_pay = Number(args[1])
	});	
}

exports.dec_gold = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		if(sp == null) return console.log("没有找到玩家数据");
		sp.decGold(args[1], "GM删除金币", "")
	});	
}

exports.set_gold = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		if(sp == null) return console.log("没有找到玩家数据");
		sp.gold = Number(args[1])
	});	
}

exports.set_redbag = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		if(sp == null) return console.log("没有找到玩家数据");
		sp.redbag = Number(args[1])
	});	
}

exports.print_player = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		console.log(sp)
	});	
}

exports.add_pay_amount = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.on_player_pay(Number(args[1]))
	});		
}

exports.set_score = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.score = Number(args[1])
	});		
}

exports.add_hoodle = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.incHoodle(args[1], "GM")
	});			
}

exports.set_hoodle = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.hoodle = Number(args[1])
	});			
}

exports.add_game_redbag = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.incGame_redbag(args[1], "GM")
	});			
}

exports.set_game_redbag = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.game_redbag = Number(args[1])
	});	
}

exports.set_total_play = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		sp.total_play = Number(args[1])
	});	
}

exports.console_player = function(args){
	g_App.playerManager.getPlayerCacheByID(args[0], function(err, sp){
		if(err) return console.log(err);
		console.log(sp)
	});	
}