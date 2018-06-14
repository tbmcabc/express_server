

exports.reloadcmds = function () {
	delete require.cache[require.resolve("./cmds")]
	
	global.g_cmds = require("./cmds")
	console.log(`[${new Date().toLocaleString()}] reloadcmds success`)	
}

exports.node = function(args){
	let js = args[0]
	eval(js)
}

exports.reload_xg_push = function(args){
	g_App.XgUtils.startPushServices()
}