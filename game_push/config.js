global.g_cmds = require("./src/cmds")

global.g_configs = {
	
	redis_configs: {
		["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
    	["sdk_login"] : { host: "10.19.76.145",  port: 6379, db: '2' },
	},

	xg_configs : {
	    ["android"] : {
	      access_id : "2100275072",
	      access_key : "A3UY717V9ENY",
	      secret_key : "500f3f411a6ec8224245418ebe63930d"
	    },
	    ["ios"] :{
	      access_id : "2200275103",
	      access_key : "I19YPR1X8D3R",
	      secret_key : "5202918e013e3c3d02df5fc27d2c7e08"
	    }
	},
	
	log_configs :{
	        appenders: [
	            {  
	               category: 'syserror',
	               type: 'dateFile',
	               filename: 'logs/sys_error',
	               pattern:"-yyyy-MM-dd.log",
	               "alwaysIncludePattern": true
	            },
	            {  
	               category: 'xg_push',
	               type: 'dateFile',
	               filename: 'logs/xg_push',
	               pattern:"-yyyy-MM-dd.log",
	               "alwaysIncludePattern": true
	            }
        ]
    }
}