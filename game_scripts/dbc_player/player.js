
require("../config")

const redis = require('redis')


let scripts = {}

scripts.dp_load_cachedata = `
	local pid = ARGV[1]
	local pinfo_key = "player_cache_"..pid

	local array = redis.call('hgetall', pinfo_key)
	local ret = {}
    for i=1,#array,2 do
        ret[array[i]] = array[i+1]
    end
    return cjson.encode(ret)
`
scripts.dp_del_cachedata = `
	local pid = ARGV[1]
	redis.call("del", "player_cache_"..pid)
`

scripts.dp_update_cache = `
	local pid = ARGV[1]
	local key = ARGV[2]
	local value = ARGV[3]
	local pinfo_key = "player_cache_"..pid
	redis.call("hset", pinfo_key, key, value)	
`

scripts.dp_query_cache_data = `
	local pid = ARGV[1]
	local pinfo_key = "player_cache_"..pid
	local key = ARGV[2]
	return redis.call("hget", pinfo_key, key) or 0
`

scripts.dp_gold_change = `
	local pid = ARGV[1]
	local way = ARGV[2]
	local time = ARGV[3]
	local value = ARGV[4]
	local remain = ARGV[5]
	local ext = ARGV[6]

	local log_gold_key = "log_gold_"..pid
	redis.call("lpush", log_gold_key, cjson.encode({ time = time, gold = value, way = way}))

	local values = {
		pid = pid,
		gold = value,
		remain = remain,
		way = way,
		ext = ext,
		time = time
	}
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
    	suffix = "month",
        table = "t_gold_log",
        model = "insert",
        values = values
    }))
`

scripts.dp_score_change = `
	local pid = ARGV[1]
	local way = ARGV[2]
	local time = ARGV[3]
	local value = ARGV[4]
	local ext = ARGV[5]
	local remain = ARGV[6]

	local log_score_key = "log_score_"..pid
	redis.call("lpush", log_score_key, cjson.encode({ time = time, score = value, way = way, ext = ext}))

	local values = {
		pid = pid,
		score = value,
		remain = remain,
		way = way,
		ext = ext,
		time = time
	}
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
    	suffix = "month",
        table = "t_score_log",
        model = "insert",
        values = values
    }))
`
scripts.dp_redbag_get = `
	local pid = ARGV[1]
	local way = ARGV[2]
	local time = ARGV[3]
	local value = ARGV[4]
	local ext = ARGV[5]
	local remain = ARGV[6]

	if ext ~= nil and ext ~= "" then
		local log_redbag_key = "log_redbag_get_"..pid
		redis.call("lpush", log_redbag_key, cjson.encode({ time = time, redbag = value, way = way, ext = ext}))
	end
	
	local values = {
		pid = pid,
		redbag = value,
		remain = remain,
		way = way,
		ext = ext,
		time = time,
	}
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
    	suffix = "month",
        table = "t_redbag_log",
        model = "insert",
        values = values
    }))
`

scripts.dp_redbag_cost = `
	local pid = ARGV[1]
	local way = ARGV[2]
	local time = ARGV[3]
	local value = ARGV[4]
	local ext = ARGV[5]
	local remain = ARGV[6]

	local log_redbag_key = "log_redbag_cost_"..pid
	redis.call("lpush", log_redbag_key, cjson.encode({ time = time, redbag = value, way = way, ext = ext}))

	local values = {
		pid = pid,
		redbag = -tonumber(value),
		remain = remain,
		way = way,
		ext = ext,
		time = time,
	}
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
    	suffix = "month",
        table = "t_redbag_log",
        model = "insert",
        values = values
    }))
`

scripts.dp_add_address = `
	local pid = ARGV[1]
	local address = ARGV[2]

	local address_key = "shipping_address_"..pid
	local cnt = tonumber(redis.call("hget", address_key, "cnt")) or 0
	if cnt >= 3 then return cjson.encode({ ret_code = -1, ret_msg = "地址数量已经达到上限" }) end

	cnt = cnt + 1
	redis.call("hset", address_key, "cnt", cnt)
	redis.call("hset", address_key, "address_"..cnt, address)
	if not redis.call("hget", address_key, "default") then
		redis.call("hset", address_key, "default", "address_1")
	end
	return cjson.encode({ ret_code = 0 })
`

scripts.dp_modify_address = `
	local pid = ARGV[1]
	local key = ARGV[2]
	local address = ARGV[3]

	local address_key = "shipping_address_"..pid
	local now_address = redis.call("hget", address_key, key)
	if not now_address then return cjson.encode({ ret_code = -1, ret_msg = "修改地址失败" }) end

	redis.call("hset", address_key, key, address)
	return cjson.encode({ ret_code = 0 })
`

scripts.dp_set_default_address = `
	local pid = ARGV[1]
	local key = ARGV[2]
	local address_key = "shipping_address_"..pid
	local now_address = redis.call("hget", address_key, key)
	if not now_address then return cjson.encode({ ret_code = -1, ret_msg = "设置失败" }) end	

	redis.call("hset", address_key, "default", key)
	return cjson.encode({ ret_code = 0 })
`

scripts.dp_get_login_data = `
	local pid = ARGV[1]

	local ret = {}
	local address_key = "shipping_address_"..pid
	local default = redis.call("hget", address_key, "default")
	if default then
		ret.shipping_address = redis.call("hget", address_key, default)
	end
	return cjson.encode(ret)
`

scripts.on_player_login = `
    local account = ARGV[1]
    local player_id = ARGV[2]
    local platform = ARGV[3]
    local time = ARGV[4]
    local server_id = ARGV[5]
    local ip = ARGV[6]
    local idfa = ARGV[7]

    local values = {}
    values.account = account
    values.player_id = player_id
    values.platform = platform
    values.server_id = server_id
    values.save_firstlogin_time = time
    values.create_time = time
    values.idfa = idfa
    values.ip = ip
    values.device = ""

    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        table = "t_first_login",
        model = "insert_or_ignore",
        values = values
    }))
`
scripts.dp_hoodle_change = `
	local pid = ARGV[1]
	local way = ARGV[2]
	local time = ARGV[3]
	local value = ARGV[4]
	local remain = ARGV[5]
	local ext = ARGV[6]

	local log_hoodle_key = "log_hoodle_"..pid
	redis.call("lpush", log_hoodle_key, cjson.encode({ time = time, hoodle = value, way = way}))

	local values = {
		pid = pid,
		hoodle = value,
		remain = remain,
		way = way,
		ext = ext,
		time = time
	}
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
    	suffix = "month",
        table = "t_hoodle_log",
        model = "insert",
        values = values
    }))
`
scripts.dp_game_redbag_change = `
	local pid = ARGV[1]
	local way = ARGV[2]
	local time = ARGV[3]
	local value = ARGV[4]
	local remain = ARGV[5]
	local ext = ARGV[6]

	local log_game_redbag_key = "log_game_redbag_"..pid
	redis.call("lpush", log_game_redbag_key, cjson.encode({ time = time, game_redbag = value, way = way}))

	local values = {
		pid = pid,
		game_redbag = value,
		remain = remain,
		way = way,
		ext = ext,
		time = time
	}
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
    	suffix = "month",
        table = "t_game_redbag_log",
        model = "insert",
        values = values
    }))
`

scripts.dp_check_first_hoodle = `
	local pid = ARGV[1]
	local num = ARGV[2]

	local ret = redis.call("hget", "first_login_hoodle", pid) or 0
	local result = 0

	if ret == 0 then
		result = 1

		local values = {
			pid = pid,
			hoodle = num
		}
	    redis.call("lpush", "dbc_log_list", cjson.encode({ 
	    	suffix = "month",
	        table = "t_first_login_hoodle_log",
	        model = "insert",
	        values = values
	    }))

	    redis.call("hset", "first_login_hoodle", pid, 1)

	end

	return result
`

// -------------------------------------------------------------------------------
// prototype modifies
// -------------------------------------------------------------------------------

Date.prototype.Format = function (fmt) { //author: meizz 
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

String.prototype.Format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g,                
        function(m,i){
            return args[i];
        });
}

// -------------------------------------------------------------------------------
// help functions
// -------------------------------------------------------------------------------

function print() {
	var a = arguments
	var str = "console.log(new Date().Format('hh:mm:ss.S')"
	for (var i=0; i<a.length; ++i) str += ',a['+i+']';
	eval(str+')')
}

function chkerror(err) {
	if (err) {
		print(err);
		throw "chkerror";
	}
}


function uploadScript(client, key) {
	client.script("load", scripts[key], function (err, ret) {
		chkerror(err)
		print("upload", key, ret)
		client.hset("dp_cache_sha", key, ret)
		client.hset("dp_cache_src", key, scripts[key])
	});
}

function loadAllScripts(){
	let cfg = g_configs.redis_configs["player"]
	let redis_client = redis.createClient(cfg);	
	redis_client.on('error',function(err){
	    console.log(err)
	});

	redis_client.on('ready',function(err){

	});

	redis_client.on('connect',function(){
		if(cfg.auth != null){
			redis_client.auth(cfg.auth, function(err, ret){
				for (let key in scripts) {
					uploadScript(redis_client, key)
				}
			});
		}
		else{
        for (let key in scripts) {
					uploadScript(redis_client, key)
				}
    }
	});
}
loadAllScripts()

setTimeout(function(){
	console.log("exit")
	process.emit("exit", function() {})	
}, 3000)







