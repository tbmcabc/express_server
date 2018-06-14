require("../config")
const redis = require('redis')

let scripts = {}

scripts.login_get_auth_code = `
    local phone = ARGV[1]
    local ts = tonumber(ARGV[2])

    math.randomseed(ts)

    local ncfg = redis.call("hget", "phone_auth_code", phone)
    if ncfg then ncfg = cjson.decode(ncfg) end
    if not ncfg or tonumber(ncfg.ts) < ts - 300 then
        ncfg = {
            code = math.random(100000, 999999),
            ts = ts
        }
    else
        if tonumber(ncfg.ts) > ts - 60 then return cjson.encode({msg="获取验证码太频繁，请稍后再试！"}) end
    end
    
    ncfg.ts = ts
    ncfg = cjson.encode(ncfg)
    redis.call("hset", "phone_auth_code", phone, ncfg)
    return ncfg
`

scripts.login_submit_phone = `
    local phone = ARGV[1]
    local code = ARGV[2]
    local ts = tonumber(ARGV[3])

    local ncfg =  redis.call("hget", "phone_auth_code", phone)
    if not ncfg then return cjson.encode({msg="你输入的验证码错误！！"}) end
    ncfg = cjson.decode(ncfg)
    
    if tostring(ncfg.code) ~= tostring(code) then return cjson.encode({msg="你输入的验证码错误！"}) end

    if tonumber(ncfg.ts) < ts - 300 then return cjson.encode({msg="验证码已经过期，请重新获取"}) end

    local act = redis.call("hget", "baidu_guest_bind_act_map", phone)
    if not act then
        redis.call("hset", "baidu_guest_bind_act_map", phone, phone)
        redis.call("hset", "baidu_guest_bind_phone_map", phone, phone)
        redis.call("hset", "baidu_guest", phone, ts)
        act = phone
    end
    return cjson.encode({act = act, ext_token = redis.call("hget", "baidu_guest", act), phone = phone})
`

scripts.on_player_login = `
    local account = ARGV[1]
    local pid = ARGV[2]
    local platform = ARGV[3]
    local time = ARGV[4]
    local ip = ARGV[5]
    local xg_token = ARGV[6]
    local appver = ARGV[7]
    local dbid = ARGV[8]

    local values = {}
    values.account = account
    values.id = pid
    values.platform = platform
    values.save_account_time = time
    values.ip = ip
    values.device = ""
    values.appver = appver

    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month", 
        table = "t_account_log",
        model = "insert",
        values = values
    }))

    redis.call("hset", "map_plat_id", pid, platform)
    redis.call("hset", "map_dbid_pid", pid, dbid)

    if xg_token ~= "" then
        redis.call("hset", "map_xg_token", pid, xg_token)
    end
`

scripts.login_by_baidu_guest = `
    local ts = ARGV[1]
    local newToken = ARGV[2]

    redis.call("HINCRBY", "baidu_guest", "incr_cnt", 1)

    local act = redis.call("hget", "baidu_guest", "incr_cnt")..ts
    redis.call("hset", "baidu_guest", act, act..newToken)
    return cjson.encode({ act = act, ext_token = act..newToken, phone = redis.call("hget", "baidu_guest_bind_phone_map", act)})
`

scripts.login_check_baidu_guest = `
    local act = ARGV[1]
    local token = ARGV[2]
    local newToken = ARGV[3]

    local rel_act = redis.call("hget", "baidu_guest_bind_act_map", act)
    if rel_act then
        act = rel_act
    end

    local old_token = redis.call("hget", "baidu_guest", act)
    if not old_token or old_token ~= token then return -1 end

    newToken = token

    redis.call("hset", "baidu_guest", act, newToken)
    
    return cjson.encode({ act = act, ext_token = newToken, phone = redis.call("hget", "baidu_guest_bind_phone_map", act)})
`

scripts.login_baidu_bind_phone = `
    local act = ARGV[1]
    local phone = ARGV[2]

    local now_phone = redis.call("hget", "baidu_guest_bind_phone_map", act)
    if now_phone then return cjson.encode({ ret_code = 1, ret_msg = "此账号已经绑定过手机号了"}) end

    local now_act = redis.call("hget", "baidu_guest_bind_act_map", phone)
    if now_act then return cjson.encode({ ret_code = 1, ret_msg = "此手机号已经绑定过了"}) end

    redis.call("hset", "baidu_guest_bind_phone_map", act, phone)
    redis.call("hset", "baidu_guest_bind_act_map", phone, act)
    return cjson.encode({ ret_code = 0})    
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
        client.hset("sdk_login_sha", key, ret)
        client.hset("sdk_login_src", key, scripts[key])
    });
}

function loadAllScripts(){
    let cfg = g_configs.redis_configs["sdk_login"]
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





