
require("../config")

const redis = require('redis')

let scripts = {}

scripts.gy_start_h5_sd = `
    local pid = ARGV[1]
    local gold = tonumber(ARGV[2])
    local token = ARGV[3]
    local ts = ARGV[4]
    local time = ARGV[5]
    local ver = ARGV[6] or ''
    local platform = ARGV[7] or ''

    local ENTRY_MAP = {
    	
    }
    
    local url = ""
    if ver == "" then
        url = 'http://zww.ooxxp.com/ktzww/1.0.0/'
    else
        url = ENTRY_MAP[platform .. '-' .. ver] or 'http://zww.ooxxp.com/ktzww/1.0.2/'
    end
    if url == "" then
         return cjson.encode({ ret_code = -1, msg = '没有找到对应的平台配置' })
    end	

    local hashMap = 'h5_player_cache_' .. pid
    
    local lstate = redis.call('hget', hashMap, 'state')
    if lstate then 
        if gold > 0 then
            redis.call('lpush', 'h5_enter_err_' .. pid, cjson.encode({
                gold = gold,
                ts = ts,
                reason = 'state not nil'
            }))
        end

        return cjson.encode({ ret_code = -1, msg = '操作太频繁，请稍后重试' })
    end
   
    redis.call("hset", hashMap, "pid", pid)
    redis.call("hset", hashMap, "token", token)
    redis.call("hset", hashMap, "ts", ts)
    redis.call("hset", hashMap, "gold", gold)
    redis.call("hset", hashMap, "redbag", 0)
    redis.call("hset", hashMap, "type", 'sd')
    redis.call("hset", hashMap, "state", 'login')
    redis.call("hset", hashMap, "org_gold", gold)

    local values = {
        pid = pid,
        enter_time = time,
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_enter_room_h5_log",
            model = "insert",
            values = values
    }));

    return cjson.encode({ ret_code = 0, url = url })
`

scripts.gy_h5_sd_login = `
    local pid = ARGV[1]
    local token = ARGV[2]

    local hashMap = 'h5_player_cache_' .. pid

    local lstate = redis.call('hget', hashMap, 'state')
    if lstate ~= 'login' then return '' end

    local _token = redis.call('hget', hashMap, 'token')
    local type = redis.call('hget', hashMap, 'type')
    local _pid = redis.call('hget', hashMap, 'pid')

    if _token ~= token or type ~= 'sd' or _pid ~= pid then return '' end

    redis.call("hset", hashMap, "state", 'play')
    return pid
`

scripts.gy_h5_sd_get_gold = `
    local pid = ARGV[1]
    local token = ARGV[2]

    local hashMap = 'h5_player_cache_' .. pid

    local lstate = redis.call('hget', hashMap, 'state')
    if lstate ~= 'play' then return 0 end

    local _token = redis.call('hget', hashMap, 'token')
    local type = redis.call('hget', hashMap, 'type')
    local _pid = redis.call('hget', hashMap, 'pid')

    if _token ~= token or type ~= 'sd' or _pid ~= pid then return 0 end

    return redis.call('hget', hashMap, 'gold')
`

scripts.gy_h5_sd_save = `
    local pid = ARGV[1]
    local token = ARGV[2]
    local gold = ARGV[3]
    local redbag = ARGV[4]

    local hashMap = 'h5_player_cache_' .. pid

    local lstate = redis.call('hget', hashMap, 'state')
    if lstate ~= 'play' then return -1 end

    local _token = redis.call('hget', hashMap, 'token')
    local type = redis.call('hget', hashMap, 'type')
    local _pid = redis.call('hget', hashMap, 'pid')

    if _token ~= token or type ~= 'sd' or _pid ~= pid then return -2 end

    redis.call("hset", hashMap, "gold", gold)
    redis.call("hset", hashMap, "redbag", redbag)
    return 0
`

scripts.gy_h5_sd_finished = `
    local pid = ARGV[1]
    local token = ARGV[2]
    local gold = ARGV[3]
    local redbag = ARGV[4]

    local hashMap = 'h5_player_cache_' .. pid

    local lstate = redis.call('hget', hashMap, 'state')
    if lstate ~= 'play' then return -1 end

    local _token = redis.call('hget', hashMap, 'token')
    local type = redis.call('hget', hashMap, 'type')
    local _pid = redis.call('hget', hashMap, 'pid')

    if _token ~= token or type ~= 'sd' or _pid ~= pid then return -2 end

    local org_gold = redis.call("hget", hashMap, "org_gold")

    redis.call("del", hashMap)

    redis.call("lpush", "h5_sd_finished_" .. pid, cjson.encode({ gold = gold, redbag = redbag, org_gold = org_gold }))
    redis.call("publish", "h5_sd_finished_notify", pid)
    
    return 0
`

scripts.gy_h5_sd_back = `
    local pid = ARGV[1]

    local hashMap = 'h5_player_cache_' .. pid

    if redis.call('exists', hashMap) == 0 then return -1 end

    local gold = redis.call('hget', hashMap, 'gold')
    local redbag = redis.call('hget', hashMap, 'redbag')

    local org_gold = redis.call("hget", hashMap, "org_gold")

    redis.call("del", hashMap)

    redis.call("lpush", "h5_sd_finished_" .. pid, cjson.encode({ gold = gold, redbag = redbag, org_gold = org_gold }))
    redis.call("publish", "h5_sd_finished_notify", pid)

    return 0
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
		client.hset("dp_game_h5_sha", key, ret)
		client.hset("dp_game_h5_src", key, scripts[key])
	});
}

function loadAllScripts(){
    let cfg = g_configs.redis_configs["game_h5"]
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







