global.g_configs = {
    http_cfg : { port : 4000 },

    redis_configs: {
        ["game_com"] : { host: "10.19.76.145",  port: 6379, db: '0' },
        ["dbc_log"] : { host: "10.19.76.145",  port: 6379, db: '4' },
        ["game_question"] : { host: "10.19.76.145",  port: 6379, db: '10' },
    },

	  db_config : {
        host: '10.19.146.233',
        user: 'gamesa',
        password: 'P0geChuiZi00!',
        database: 'toy_dbc_log',
        port: 3306,
        multipleStatements: true
    },

    AccessSecret : "9a214e3f0a8652c386e9da1618f2d318",
}