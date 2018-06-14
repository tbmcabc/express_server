const fs = require("fs")
const HDUtils = require("hd-utils")
const NetWork = require("network")
const mysql = require("mysql")
const log4js = require("log4js")
log4js.configure(g_configs.log_configs)

class SdkLoginApp{
	constructor(){
		this.md_http = require("./md_http")

		this.sdkloginRedis = new NetWork.RedisCli("sdk_login", g_configs.redis_configs["sdk_login"], "sdk_login_sha")

		this.mysqlCli = mysql.createPool(g_configs.db_config)
		this.base64 = new HDUtils.Base64();

		this.log_http_error = log4js.getLogger("httperror")
		this.log_login = log4js.getLogger("login")
		this.log_sys_error = log4js.getLogger("syserror")
	}

	lanuch(){
		g_configs.rsa = {
	    	privateKey : fs.readFileSync("rsa_private_key.pem").toString(),
	    }

		this.md_http.start()
	}

	get_ts(){
		return Math.floor(new Date().getTime()/1000);
	}
}

module.exports = SdkLoginApp;