global.g_cmds = require("./src/cmds")

global.g_configs = {
	
	http_cfg : { port : 80 },

	db_config : {
        host: '10.19.146.233',
        user: 'gamesa',
        password: 'P0geChuiZi00!',
        database: 'toy_dbc_game_toy',
        port: 3306,
        multipleStatements: true
    },

	redis_configs: {
		["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
		["game_toy"] : { host: "10.19.76.145",  port: 6379, db: '3' },
    		["sdk_login"] : { host: "10.19.76.145",  port: 6379, db: '2' },
	},
	
	//只提取一个娃娃时候收取的手续费
    extract_poundage : 60,

    sku_cfg : {
        sdk_appid : "5a56cf5600010100007f2e89",
        sdk_appsecret : "4c47ec959d24491daa8849f6515d60e1"
    },

    AccessSecret : "9a214e3f0a8652c386e9da1618f2d318",

    log_configs :{
        appenders: [
            {  
               category: 'httperror',
               type: 'dateFile',
               filename: 'logs/http_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'syserror',
               type: 'dateFile',
               filename: 'logs/sys_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'toy',
               type: 'dateFile',
               filename: 'logs/toy',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            }
        ]
    }
}