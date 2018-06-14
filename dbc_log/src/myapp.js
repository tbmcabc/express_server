const fs = require("fs")
const NetWork = require("network")
const HDUtils = require("hd-utils")
const mysql = require("mysql")
const log4js = require("log4js")
log4js.configure(g_configs.log_configs)

class DbcLogApp{
	constructor(){
		this.md_http = require("./md_http")
		this.mysqlCli = mysql.createPool(g_configs.db_config)
		this.mysqlCliD2g = mysql.createPool(g_configs.db_d2g_config)
		this.gamecomRedis = new NetWork.RedisCli("game_com", g_configs.redis_configs["game_com"], null)
		this.playerRedis = new NetWork.RedisCli("player", g_configs.redis_configs["player"], null)
		this.sdkLoginRedis = new NetWork.RedisCli("sdk_login", g_configs.redis_configs["sdk_login"], null)
		this.subsdkLoginRedis = new NetWork.RedisCli("sdk_login", g_configs.redis_configs["sdk_login"], null)
		this.gameToyRedis = new NetWork.RedisCli("game_toy", g_configs.redis_configs["game_toy"], null)
		this.dbcLogRedis = new NetWork.RedisCli("dbc_log", g_configs.redis_configs["dbc_log"], null)
		this.subDbcLogRedis = new NetWork.RedisCli("sub_dbc_log", g_configs.redis_configs["dbc_log"], null)

		this.log_http_error = log4js.getLogger("httperror")
		this.log_log_error = log4js.getLogger("logerror")
	}

	lanuch(){
		this.md_http.start()
		this.startGameComRedisListening();
		this.startPlayerRedisListening();
		this.startSdkLoginRedisListening();
		this.startGameToyRedisListening();
		this.startDbcLogRedisListening();
	}

	startGameComRedisListening(){
		this.gamecomRedis.call("blpop", "dbc_log_list", 0, function(err, ret){
            if(err) console.log(err);
            g_App.on_get_dbc_log_item(ret[1]);
            g_App.startGameComRedisListening();
        });
	}

	startPlayerRedisListening(){
		this.playerRedis.call("blpop", "dbc_log_list", 0, function(err, ret){
            if(err) console.log(err);
            g_App.on_get_dbc_log_item(ret[1]);
            g_App.startPlayerRedisListening();
        });
	}

	startSdkLoginRedisListening(){
		this.sdkLoginRedis.call("blpop", "dbc_log_list", 0, function(err, ret){
            if(err) console.log(err);
            g_App.on_get_dbc_log_item(ret[1]);
            g_App.startSdkLoginRedisListening();
        });
	}

	startGameToyRedisListening(){
		this.gameToyRedis.call("blpop", "dbc_log_list", 0, function(err, ret){
            if(err) console.log(err);
            g_App.on_get_dbc_log_item(ret[1]);
            g_App.startGameToyRedisListening();
        });
	}
	
	startDbcLogRedisListening(){
		this.subDbcLogRedis.call("blpop", "dbc_log_list", 0, function(err, ret){
            if(err) console.log(err);
            g_App.on_get_dbc_log_item(ret[1]);
            g_App.startDbcLogRedisListening();
        });
	}

	on_get_dbc_log_item(log){
		if(log == null) return;
		let now = new Date()
		let jlog = JSON.parse(log)
		let tableName = ""
		let create_table_str = ""
		let month = now.getMonth() + 1
		if(month < 10) month = `0${month}`
		if(jlog.suffix == "month"){
			tableName = `${jlog.table}_${now.getFullYear()}${month}`
			create_table_str = `CREATE TABLE IF NOT EXISTS ${tableName} like ${jlog.table};`
		}
		else if(jlog.suffix == "day"){
			tableName = `${jlog.table}_${now.getFullYear()}${month}${now.getDate()}`
			create_table_str = `CREATE TABLE IF NOT EXISTS ${tableName} like ${jlog.table};`	
		}
		else
			tableName = jlog.table

		let str_sql = ""
		let columns = []
		let values  = []
		let placeholder = []
		for(let key in jlog.values){
			columns.push(key)
			values.push(jlog.values[key])
			placeholder.push("?")
		}
		columns.push("save_time")
		placeholder.push("now()")
		if(jlog.values.pid != null && jlog.values.platform == null){
			g_App.subsdkLoginRedis.call("hget", "map_plat_id", jlog.values.pid, function(err, ret){
				if(ret == null) ret = 0
				columns.push("platform")
				placeholder.push("?")
				values.push(ret)
				g_App.save_to_mysql(jlog, create_table_str, tableName, columns, placeholder, values)
			});
		}
		else{
			this.save_to_mysql(jlog, create_table_str, tableName, columns, placeholder, values)
		}
	}

	save_to_mysql(jlog, create_table_str, tableName, columns, placeholder, values){
		let now = new Date()
		let str_sql = ""
		if(jlog.model == "insert"){
			str_sql = `insert into ${tableName}(${columns.join(",")}) values(${placeholder.join(",")})`
		}
		else if(jlog.model == "update"){
			let set_str = []
			for(let i = 0 ; i < columns.length ; i++){
				set_str.push(`${columns}=?`)
			}
			str_sql = `update ${tableName} set ${set_str.join(",")}`
		}
		else if(jlog.model == "insert_or_ignore"){
			str_sql = `insert ignore into ${tableName}(${columns.join(",")}) values(${placeholder.join(",")}) `	
		}
		else if(jlog.model == "add_date_cnt"){
			columns.push("date")
			placeholder.push("?")
			values.push(now.toLocaleDateString())
			let modifys = []
			if (jlog.modifys){
				for(let idx in jlog.modifys){
					let key = jlog.modifys[idx]
					modifys.push(`${key}=?`)
					values.push(jlog.values[key])
				}
				str_sql = `insert ignore into ${tableName}(${columns.join(",")}) values(${placeholder.join(",")}) ON DUPLICATE KEY UPDATE cnt = cnt + 1, ${modifys.join(",")}`	
			}else{
				str_sql = `insert ignore into ${tableName}(${columns.join(",")}) values(${placeholder.join(",")}) ON DUPLICATE KEY UPDATE cnt = cnt + 1`					
			}			
		}
		else if(jlog.model == "insert_or_update"){
			let modifys = []
			for(let idx in jlog.modifys){
				let key = jlog.modifys[idx]
				modifys.push(`${key}=?`)
				values.push(jlog.values[key])
			}
			modifys.push("save_time=now()")
			str_sql = `insert into ${tableName}(${columns.join(",")}) values(${placeholder.join(",")}) ON DUPLICATE KEY UPDATE ${modifys.join(",")}`	
		}
		if(jlog.database == "d2g_log"){
			this.mysqlCliD2g.query(create_table_str + str_sql, values, function(err, ret){
				if(err) { 
					g_App.log_log_error.error(`${str_sql}:${JSON.stringify(jlog)}:${err}`)

					g_App.dbcLogRedis.call("lpush", "dbc_log_error_list", JSON.stringify(jlog), function(err, ret){
						if(err) return console.log(err);
					});
					return console.log(str_sql, err);
				}
			});
		}
		else{
			this.mysqlCli.query(create_table_str + str_sql, values, function(err, ret){
				if(err) {
					g_App.log_log_error.error(`${str_sql}:${JSON.stringify(jlog)}:${err}`)
					g_App.dbcLogRedis.call("lpush", "dbc_log_error_list", JSON.stringify(jlog), function(err, ret){
						if(err) return console.log(err);
					});
					return console.log(str_sql, err);
				}
			});
		}
	}

}

module.exports = DbcLogApp;