require("../config")
const redis = require('redis')

let scripts = {}

scripts.gq_receive_replay = `
    local pid = ARGV[1]
    local msg = ARGV[2]

    local rkey = "game_replay_"..pid
    redis.call("RPUSH", rkey, msg)
    redis.call("LTRIM", rkey, -10, -1)
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
        client.hset("game_question_sha", key, ret)
        client.hset("game_question_src", key, scripts[key])
    });
}

function loadAllScripts(){
    let cfg = g_configs.redis_configs["game_question"]
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





