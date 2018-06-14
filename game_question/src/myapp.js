const NetWork = require("network")
const mysql = require("mysql")

class GameQuestionApp{
	constructor(){
		this.md_http = require("./md_http")
		this.mysqlCli = mysql.createPool(g_configs.db_config)
		this.gamecomRedis = new NetWork.RedisCli("game_com", g_configs.redis_configs["game_com"], null) 
		this.gamequestionRedis = new NetWork.RedisCli("game_question", g_configs.redis_configs["game_question"], "game_question_sha")
		this.dbcLogRedis = new NetWork.RedisCli("dbc_log", g_configs.redis_configs["dbc_log"], null)
	}

	lanuch(){
		this.md_http.start()
	}

}

module.exports = GameQuestionApp;