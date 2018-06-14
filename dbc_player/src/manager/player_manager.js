const mysql = require("mysql")
const GameframeProto = require("protocol").GameframeProto
const Player= require("./player")
const NetWork = require("network")

class PlayerManager {

    constructor(){
        this.map_playerCache = {}
        this.map_playerService = {}
        this.map_syncNotify = {}

        this._msgPacker = new NetWork.MsgPack();

        this.initialize()
    }

    initialize(){
        for (let dbid in g_configs.db_configs) {
            this.map_playerService[Number(dbid)] = mysql.createPool(g_configs.db_configs[dbid])    
        }

        setInterval(this.loop.bind(this), 200)
    }

    addSyncPlayer(pid){
        this.map_syncNotify[pid] = true
    }

    loop(){
        for(let pid in this.map_syncNotify){
            let sp = this.map_playerCache[pid]
            if(sp != null){
                sp.syncProsMsg()
            }
        }

        this.map_syncNotify = {}
    }

    addPlayerDataCache(sp, callback){
        let player = new Player(sp)
        let self = this;
        player.loadRedisData(function(err){
            if(err) return console.log(err);
            if(self.map_playerCache[player.id] != null) return callback(null, self.map_playerCache[player.id])
            self.map_playerCache[player.id] = player;
            callback(null, player);
        });
    }

    removePlayerDataCache(sp){
        //if(sp.online) return;
        //let self = this;
        //sp.delRedisData();
        delete this.map_playerCache[sp.id];
    }

    createNewPlayer(id, dbid, recv_params, callback){
        let self = this;
        this.getPlayerCache(id, dbid, function(err, sp){
            if(err) return callback(err, null)
            if(sp) return callback(null, sp, true);
            let ps = self.map_playerService[dbid]
            if(ps == null) return callback("ps==null", null);
            var newData = new GameframeProto.SPlayerData();
            newData.id = id;
            newData.dbid = dbid;
            newData.sex = recv_params.sex
            newData.nick_name = recv_params.nick_name
            newData.head_img = recv_params.head_img
            newData.score = g_configs.init_config.score
            newData.gold = g_configs.init_config.gold

            newData.Pack(self._msgPacker, true);
            let data = self._msgPacker.getBuffer()
            ps.query("call p_create_player(?,?,?,?,?,?)",
                [id, data, newData.nick_name, recv_params.plat_act, recv_params.plat_id, recv_params.channel],
                function(err, rows, fileds){
                    if(err) return callback(err, null);

                    self.getPlayerCache(id, dbid, callback);
                }
            );
        });
    }

    getPlayerCache(id, dbid, callback){
        let self = this;
        if(this.map_playerCache[id] != null)
            return callback(null, this.map_playerCache[id])
        let ps = this.map_playerService[dbid]
        if(ps == null) return callback("ps==null", null);
        var strsql = "select plat_act, data, plat_id, channel,last_order_time,create_time from t_player where id = ?"
        ps.query(strsql, [id], function(err, ret){
            if(err) return callback(err, null);
            
            if(ret.length == 0) return callback(null, null);
            
            let msgpack = new NetWork.MsgPack(ret[0].data);
            let sp = new GameframeProto.SPlayerData();
            sp.Unpack(msgpack)
            sp.plat_act = ret[0].plat_act
            sp.plat_id = ret[0].plat_id
            sp.channel = ret[0].channel
            sp.last_order_time = ret[0].last_order_time
            sp.create_time = new Date(ret[0].create_time).toLocaleString()
            self.addPlayerDataCache(sp, callback);
        });
    }
    //获取在线玩家
    getPlayerCacheByID(id, callback){
        if (this.map_playerCache[id] != null)
            return callback(null, this.map_playerCache[id])
        let self = this
        g_App.playerRedis.evalsha("dp_query_cache_data", 0, id, "cache.number.dbid", function(err, dbid){
            if(err) return callback(err);
            if(dbid == 0) return callback(null, null);
            self.getPlayerCache(id, Number(dbid), callback);
        });
    }

    getPlayerCacheByIDEx(pid){
        return this.map_playerCache[pid];
    }
    
    saveAndDelPlayerCache(player){
        if(player == null || player.dbid == null) return;
        let ps = this.map_playerService[player.dbid]
        if(ps == null) return;
        player.data.Pack(this._msgPacker, true);

        let data = this._msgPacker.getBuffer()
        let view_data = {
            gold: player.gold,
            score : player.score,
            redbag : player.redbag
        }
        let self = this
        ps.query("call p_update_player_data(?,?,?,?)", [player.id, data, player.last_order_time, JSON.stringify(view_data) ], function(err, ret){
            if(err) return console.log(`p_update_player_data ${err}`);
            self.removePlayerDataCache(player)
        });
        g_App.gamecomRedis.call("lpush", "dbc_log_list", JSON.stringify({
            table : "t_player_unpack",
            model : "insert_or_update",
            database : "d2g_log",
            values : {
                pid : player.id,
                gold : player.gold,
                score : player.score,
                redbag : player.redbag,
                sex : player.sex,
                nick_name : player.nick_name,
                create_time : player.data.create_time,
                platform : player.plat_id,
                total_charge : player.total_charge,
                total_catch : player.total_catch,
                total_catch_succ : player.total_catch_succ,
                total_cost : player.total_cost,
                free_gold : player.gold - player.gold_pay,
                device : player.device,
                total_charge_hoodle : player.total_charge_hoodle,
                game_redbag : player.game_redbag
            },
            modifys : ["gold", "score", "redbag", "sex", "total_charge", "total_catch", "total_catch_succ", "total_cost", "free_gold","device","game_redbag","total_charge_hoodle"]
        }), function(err, ret){
            if(err) return console.log(err);
        });
    }


    queryOrderList(sp){
        let ps = this.map_playerService[sp.dbid]
        if(ps == null) return;

        ps.query("call p_query_order_list(?,?)", [sp.id, sp.last_order_time], function(err, ret){
            if(err) return console.log(err);
            let list = ret[0]
            for(let idx in list){
                let order = list[idx]
                let keys = order.product_id.split(".")
                let num = Number(keys[1])
                if(keys[0] == "score"){

                }
                sp.last_order_time = order.pay_time
            }
        });
    }
}

module.exports = PlayerManager;