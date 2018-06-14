const fs = require("fs")
global.g_cmds = require("./src/cmds")

global.g_configs = {
	sid : 400,
	
	http_cfg : { port : 81 },

	db_configs : {
        [1] : { host: '10.19.146.233', user: 'gamesa', password: 'P0geChuiZi00!', database: 'toy_dbc_player', port: 3306, multipleStatements: true, charset: "utf8mb4"},
	},

	redis_configs: {
		["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
		["player"] : { host: "10.19.76.145",  port: 6379, db: '1' },
		["log"] : { host: "10.19.76.145",  port: 6379, db: '0' },
		["user"] : { host: "10.19.76.145",  port: 6379, db: '0' },
		["game_toy"] : { host: "10.19.76.145",  port: 6379, db: '3' },
		["game_h5"] : { host: "10.19.76.145",  port: 6379, db: '4' },
	},

	init_config : {
		score : 0,
		gold : 50,
    hoodle : 20,
	},

	live_cfg :{
	    "sdk_appid": 1400053114,
	    "expire_after": 180 * 24 * 3600,
	    "private_key": fs.readFileSync("live_rsa_private_key.pem").toString(),
	    "public_key": "",
	    "admin_identifier" : "admin_jiangpeng",
    },

    exchange_gold_ratio : 1,

    yyl_cfg : {
    	"wid" : "7557",
    	"pwd" : "1989627"
    },

    sku_cfg : {
        sdk_appid : "5a56cf5600010100007f2e89",
        sdk_appsecret : "4c47ec959d24491daa8849f6515d60e1"
    },
    
    extract_poundage : 60,
    h5_portal: true,
    catch_vr_force : 400,
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
               category: 'accesserror',
               type: 'dateFile',
               filename: 'logs/access_error',
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
               category: 'payerror',
               type: 'dateFile',
               filename: 'logs/pay_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'mallerror',
               type: 'dateFile',
               filename: 'logs/mall_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'liveerror',
               type: 'dateFile',
               filename: 'logs/live_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'fetcherror',
               type: 'dateFile',
               filename: 'logs/fetch_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'rediserror',
               type: 'dateFile',
               filename: 'logs/redis_error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
        ]
    }
}