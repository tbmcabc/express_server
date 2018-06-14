global.g_configs = {
    http_cfg : { port : 88 },

    redis_configs: {
        ["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
        ["player"] : { host: "10.19.76.145",  port: 6379, db: '1' },
        ["sdk_login"] : { host: "10.19.76.145",  port: 6379, db: '2' },
        ["game_toy"] : { host: "10.19.76.145",  port: 6379, db: '3' },
        ["dbc_log"] : { host: "10.19.76.145",  port: 6379, db: '4' },
        ["game_h5"] : { host: "10.19.76.145",  port: 6379, db: '4' },
    },

	db_config : {
        host: '10.19.146.233',
        user: 'gamesa',
        password: 'P0geChuiZi00!',
        database: 'toy_dbc_log',
        port: 3306,
        multipleStatements: true
    },


    db_d2g_config : {
        host: '10.19.146.233',
        user: 'gamesa',
        password: 'P0geChuiZi00!',
        database: 'toy_d2g_log',
        port: 3306,
        multipleStatements: true
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
               category: 'logerror',
               type: 'dateFile',
               filename: 'logs/log',
               pattern:"-yyyy-MM-dd.log",
               "alwaysIncludePattern": true
            },
        ]
    }
}