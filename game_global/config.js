global.g_cmds = require("./src/cmds")

global.g_configs = {
	
	http_cfg : { port : 3000 },
    
	redis_configs: {
		["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
    ["sdk_login"] : { host: "10.19.76.145",  port: 6379, db: '2' },
		["game_toy"] : { host: "10.19.76.145",  port: 6379, db: '3' },
	},

   db_config : {
        host: '10.19.146.233',
        user: 'gamesa',
        password: 'P0geChuiZi00!',
        database: 'toy_dbc_game_toy',
        port: 3306,
        multipleStatements: true
    },

	SkuSecret : "520059f443cef0584e4910163ca92699",
	
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
	               category: 'pay',
	               type: 'dateFile',
	               filename: 'logs/pay',
	               pattern:"-yyyy-MM-dd.log",
	               "alwaysIncludePattern": true
	            },
	            {  
	               category: 'pay_succ',
	               type: 'dateFile',
	               filename: 'logs/pay_succ',
	               pattern:"-yyyy-MM-dd.log",
	               "alwaysIncludePattern": true
	            },
	            {  
	               category: 'catch',
	               type: 'dateFile',
	               filename: 'logs/catch',
	               pattern:"-yyyy-MM-dd.log",
	               "alwaysIncludePattern": true
            },
            {  
               category: 'mall',
               type: 'dateFile',
               filename: 'logs/mall',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'mall_error',
               type: 'dateFile',
               filename: 'logs/mall_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'fetch',
               type: 'dateFile',
               filename: 'logs/fetch',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'fetch_error',
               type: 'dateFile',
               filename: 'logs/fetch_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'toy_expire_error',
               type: 'dateFile',
               filename: 'logs/toy_expire_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            }
        ]
    }
}