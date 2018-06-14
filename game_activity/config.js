global.g_cmds = require("./src/cmds")

global.g_configs = {
	
	redis_configs: {
		["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
    ["game_toy"] : { host: "10.19.76.145",  port: 6379, db: '3' },
	},

	log_configs :{
        appenders: [
            {  
               category: 'syserror',
               type: 'dateFile',
               filename: 'logs/sys_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            }
        ]
    }
}