global.g_cmds = require("./src/cmds")

global.g_configs = {
    http_cfg : { port : 8000 },
    
    db_config : {
        host: '10.19.146.233',
        user: 'gamesa',
        password: 'P0geChuiZi00!',
        database: 'toy_sdk_login',
        port: 3306,
        multipleStatements: true
    },

    redis_configs: {
        ["sdk_login"] : { host: "10.19.76.145",  port: 6379, db: '2' },
    },

    game_gate_urls : [
        "ws://106.75.92.180:7878"
    ],

    wss_game_gate_url : "wss://zwwh5littlegame.guodong.com/websocket",
    
    http_srvs_url : "http://106.75.92.180:9000",
    https_srvs_url : "https://zwwh5littlegame.guodong.com",

    sms_config : {
        accountSid : "65b8a2870cdf48e7597aa0b1e0756304",
        accountToken : "87eed41fcff4c69e07f57fbfccd13e3e",
        appId : "354e12e01e78423d8bc9c076a2c74608",
        restAddress : "api.ucpaas.com",
        softVer : "2014-06-30",
        templateid : "34137"
    },

    AccessSecret : "9a214e3f0a8652c386e9da1618f2d318",

    log_configs :{
        appenders: [
            {  
               category: 'httperror',
               type: 'dateFile',
               filename: 'logs/error',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
            {  
               category: 'login',
               type: 'dateFile',
               filename: 'logs/login',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            }
        ]
    }
}