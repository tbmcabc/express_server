const GameframeProto = require("protocol").GameframeProto

class CacheData {

	constructor(pid){
		this._pid = pid
		this.cache = {}
	}

	loadRedisData(callback){
		let self = this
		g_App.playerRedis.evalsha("dp_load_cachedata", 0, this._pid, function (err, ret) {
			if(err) return callback(`dp_load_cachedata ${err}`);
			let jdata = JSON.parse(ret)
			for (let key in jdata) {
				let keys = key.split('.');
                if (self[keys[0]] != null) {
                    let val = jdata[key];
                    if (keys[1] == "number"){
                        self[keys[0]][keys[2]] = Number(val)
                    }
                    else if(keys[1] == "bool"){
                        self[keys[0]][keys[2]] = Boolean(val)
                    }
                    else if(keys[1] == "datetime"){
                        self[keys[0]][keys[2]] = new Date(val)
                    }
                    else{
                        self[keys[0]][keys[2]] = val 
                    }
                }
			}
			callback()
		});
	}

    delRedisData(){
        g_App.playerRedis.evalsha("dp_del_cachedata", 0, this._pid, function(err, ret){
            if(err) return console.log(`dp_del_cachedata ${err}`);
        });
    }

	updateData(key, val){
		g_App.playerRedis.evalsha("dp_update_cache", 0, this._pid, key, val, function(err, ret){
			if(err) return console.log(`dp_update_cache ${err} ${key}`);
		});
	}

    get online() { return this.cache.online; }
    set online(online) { this.cache.online = online; this.updateData("cache.bool.online", online); }

	set dbid(dbid){ this.cache.dbid = dbid; this.updateData("cache.number.dbid", dbid); }

}

class Player extends CacheData{

    constructor(sp){
    	super(sp.id)
        this.data = sp;
        this.msgSyncpros = { }
    }

    get gold() { return this.data.gold; }
    set gold(val)  { if(this.data.gold == val) return; this.data.gold = val; this.updateData("data.number.gold", val); this.syncPro("gold", val); }

    get score() { return this.data.score; }
    set score(val)  { if(this.data.score == val) return; this.data.score = val; this.updateData("data.number.score", val); this.syncPro("score", val); }
    
    get redbag() { return this.data.redbag; }
    set redbag(val) { if(this.data.redbag == val) return; this.data.redbag = val; this.updateData("data.number.redbag", val); this.syncPro("redbag", val); }

    get sex() { return this.data.sex; }
    set sex(val) { if(this.data.sex == val) return; this.data.sex = val; this.updateData("data.number.sex", val); }

    get head_img() { return this.data.head_img; }
    set head_img(val) { if(this.data.head_img == val) return; this.data.head_img = val; this.updateData("data.string.head_img", val); }

    get nick_name() { return this.data.nick_name; }
    set nick_name(val) { if(this.data.nick_name == val) return; this.data.nick_name = val; this.updateData("data.string.nick_name", val); }

    get sign_cnt(){ return this.data.sign_cnt; }
    set sign_cnt(val) { if(this.data.sign_cnt == val) return; this.data.sign_cnt = val; this.updateData("data.number.sign_cnt", val); this.syncPro("sign_cnt", val); }

    get sign_date() { return this.data.sign_date; }
    set sign_date(val) { if(this.data.sign_date == val) return; this.data.sign_date = val; this.updateData("data.string.sign_date", val); this.syncPro("sign_date", val); }

    get total_charge() { return this.data.total_charge; }
    set total_charge(val) { if(this.data.total_charge == val) return; this.data.total_charge = val; this.updateData("data.number.total_charge", val); }

    get total_catch() { return this.data.total_catch; }
    set total_catch(val) { if(this.data.total_catch == val) return; this.data.total_catch = val; this.updateData("data.number.total_catch", val); }

    get total_catch_succ() { return this.data.total_catch_succ; }
    set total_catch_succ(val) { if(this.data.total_catch_succ == val) return; this.data.total_catch_succ = val; this.updateData("data.number.total_catch_succ", val); }

    get total_cost() { return this.data.total_cost; }
    set total_cost(val) { if(this.data.total_cost == val) return; this.data.total_cost = val; this.updateData("data.number.total_cost", val); }

    get share_date() { return this.data.share_date; }
    set share_date(val) { if(this.data.share_date == val) return; this.data.share_date = val; this.updateData("data.string.share_date", val); }

    get share_sign_date() { return this.data.share_sign_date; }
    set share_sign_date(val) { if(this.data.share_sign_date == val) return; this.data.share_sign_date = val; this.updateData("data.string.share_sign_date", val); }

    get vip() { return this.data.vip; }
    set vip(val) { if(this.data.vip == val) return; this.data.vip = val; this.updateData("data.number.vip", val); this.syncPro("vip", val); }

    get vip_charge() { return this.data.vip_charge; }
    set vip_charge(val) { if(this.data.vip_charge == val) return; this.data.vip_charge = val; this.updateData("data.number.vip_charge", val); this.syncPro("vip_charge", val); }

    get vip_expire_date() { return this.data.vip_expire_date; }
    set vip_expire_date(val) { if(this.data.vip_expire_date == val) return; this.data.vip_expire_date = val; this.updateData("data.string.vip_expire_date", val); }

    get vip_login_date() { return this.data.vip_login_date; }
    set vip_login_date(val) { if(this.data.vip_login_date == val) return; this.data.vip_login_date = val; this.updateData("data.string.vip_login_date", val); }

    get growth() { return this.data.growth; }
    set growth(val) { if(this.data.growth == val) return; this.data.growth = val; this.updateData("data.number.growth", val); this.syncPro("growth", val); }

    get growth_level() { return this.data.growth_level; }
    set growth_level(val) { if(this.data.growth_level == val) return; this.data.growth_level = val; this.updateData("data.number.growth_level", val); this.syncPro("growth_level", val); }

    get gold_pay() { return this.data.gold_pay; }
    set gold_pay(val) { if(this.data.gold_pay == val) return; this.data.gold_pay = val; this.updateData("data.number.gold_pay", val); }    

    get catch_ticket() { return this.data.catch_ticket; }
    set catch_ticket(val) { if(this.data.catch_ticket == val) return; this.data.catch_ticket = val; this.updateData("data.number.catch_ticket", val); this.syncPro("catch_ticket", val); }        
    
    get id() { return this.data.id; }
    get dbid() { return this.data.dbid; }
    get channel() { return this.data.channel; }
    get plat_act() { return this.data.plat_act; }
    get plat_id() { return this.data.plat_id; }
    get last_order_time() { return this.data.last_order_time; }
    set last_order_time(val) { if(this.data.last_order_time == val) return; this.data.last_order_time = val; this.updateData("data.datetime.last_order_time", val.toLocaleString()); }

    get pay_flag() { return this.data.pay_flag; }
    set pay_flag(val) { if(this.data.pay_flag == val) return; this.data.pay_flag = val; this.updateData("data.number.pay_flag", val); this.syncPro("pay_flag", val); }
    
    get device() { return this.data.device; }
    set device(val) { if(this.data.device == val) return; this.data.device = val; this.updateData("data.string.device", val); }

    get hoodle() { return this.data.hoodle; }
    set hoodle(val)  { if(this.data.hoodle == val) return; this.data.hoodle = val; this.updateData("data.number.hoodle", val); this.syncPro("hoodle", val); }

    get game_redbag() { return this.data.game_redbag; }
    set game_redbag(val)  { if(this.data.game_redbag == val) return; this.data.game_redbag = val; this.updateData("data.number.game_redbag", val); this.syncPro("game_redbag", val); }

    get total_play() { return this.data.total_play; }
    set total_play(val) { if(this.data.total_play == val) return; this.data.total_play = val; this.updateData("data.number.total_play", val); }

    get total_charge_hoodle() { return this.data.total_charge_hoodle; }
    set total_charge_hoodle(val) { if(this.data.total_charge_hoodle == val) return; this.data.total_charge_hoodle = val; this.updateData("data.number.total_charge_hoodle", val); }

    sendMsg(msg){
        let self = this
        g_App.gamecomRedis.call("publish", "send_msg_to_player", 
            JSON.stringify({
                pid : self.id,
                json : JSON.stringify(msg)
            }),
            function(err, ret){});
    }

    syncPro(field, val){
        this.msgSyncpros[field] = val

        g_App.playerManager.addSyncPlayer(this.id)
    }

    syncProsMsg(){
        if(Object.keys(this.msgSyncpros).length == 0)
             return;
        this.sendMsg({ op : "dp_sync_pro", pros : this.msgSyncpros })
        this.msgSyncpros = {}
    }

    on_player_login(){
        this.updateData("cache.number.dbid", this.dbid);
        this.updateData("data.number.score", this.score)
        this.updateData("data.number.gold", this.gold)
        this.updateData("data.string.channel", this.channel)
        
        this.startGetCmdListening()
        this.startGetH5FinishedListening_SD()
        //this.check_vip_expire()

        if(this.sign_cnt >= 7){
            this.sign_cnt = 0
            //this.sign_date = new Date().toLocaleDateString()
        }
    }

    on_player_pay(amount){
        this.total_charge = this.total_charge + amount
        //首先看看VIP过期没有
        //this.check_vip_expire(amount)

        g_App.gameToyRedis.evalsha("gy_invite_friend_charge", 0, 
            this.id,
            amount,
            this.nick_name,
            this.head_img,
            function(err, ret){
                if(err) return console.log(err);
            });
    }

    on_vip_login(){
        let self = this
        let now_date_str = new Date().toLocaleDateString()
        if(this.vip > 0 && this.vip_login_date != now_date_str){
            g_App.gamecomRedis.call("hget", "cfg_vip", this.vip, function(err, ret){
                if(err) return console.log(err);
                if(ret == null) return;
                if(self.vip_login_date == now_date_str) return;
                let jret = JSON.parse(ret)

                self.vip_login_date = now_date_str
                self.incGold(Number(jret.give), "VIP签到奖励", now_date_str)
                let expire = (new Date(self.vip_expire_date) - new Date(now_date_str)) / (24 * 3600 * 1000)
                self.sendMsg({ op : "vip_login", gold : Number(jret.give), vip : self.vip, expire : expire})
            });
        }
    }

    check_vip_expire(amount){
        let now_date = new Date()
        //已有VIP看看是否过期
        if(this.vip_expire_date != ""){
            let vip_expire_date = new Date(this.vip_expire_date)
            //现在的时间大于VIP过期时间(充值VIP)
            if(now_date > vip_expire_date){
                this.vip = 0
                this.vip_charge = 0
                this.vip_expire_date = ""
                this.vip_login_date = ""
            }
        }
        if(amount != undefined){
            let self = this
            this.vip_charge = this.vip_charge + amount

            g_App.gamecomRedis.evalsha("dp_cal_vip", 0, this.vip_charge, function(err, ret){
                if(err) return console.log(err);
                if(ret == 0) return;

                self.vip = ret
                if(self.vip_expire_date == ""){
                    self.vip_expire_date = new Date(now_date.getTime() + 30 * 24 * 3600 * 1000).toLocaleDateString()
                }
                self.on_vip_login()
            });
        }
        else{
            this.on_vip_login()
        }
    }

    sendMsgBox(txt){
        this.sendMsg({ op: "msgbox", txt : txt }) 
    }

    incScore(score, way, ext, output){
        score = Number(score)
        if(Number.isNaN(score)) return false;
        if(score <= 0) return false;
        this.score = this.score + score;
        g_App.playerRedis.evalsha("dp_score_change", 0, this.id, 
            way, new Date().toLocaleString(),score, ext, this.score, function(err, ret){
            if(err) return console.log(err)
        });
        //如果是产出，则需要添加水线
        if(output == true){
            g_App.gamecomRedis.call("hincrby", "game_server_control", "profits", -score, function(err, ret){
                if(err) return console.log(err);          
            });
        }
        return true;
    }

    decScore(score, way, ext){
        score = Number(score)
        if(Number.isNaN(score)) return false;
        if(score <= 0) return false;
        if(this.score < score) return false;
        this.score = this.score - score;
        g_App.playerRedis.evalsha("dp_score_change", 0, this.id, 
            way, new Date().toLocaleString(), -score, ext, this.score, function(err, ret){
            if(err) return console.log(err)
        });
        return true;
    }

    incGold(gold, way, ext){
        gold = Number(gold)
        if(Number.isNaN(gold)) return false;
        if(gold <= 0) return false;
        this.gold = this.gold + gold
        if (ext == null) ext = "";
        g_App.playerRedis.evalsha("dp_gold_change", 0, this.id, 
            way, new Date().toLocaleString(), gold, this.gold , ext, function(err, ret){
            if(err) return console.log(err)
        });
        return true;
    }

    decGold(gold, way, ext){
        gold = Number(gold)
        if(Number.isNaN(gold)) return false;
        if(gold <= 0) return false;
        if(this.gold < gold) return false;
        this.gold = this.gold - gold;
        if (ext == null) ext = "";
        this.total_cost = this.total_cost + gold
        g_App.playerRedis.evalsha("dp_gold_change", 0, this.id, 
            way, new Date().toLocaleString(), -gold, this.gold, ext, function(err, ret){
            if(err) return console.log(err)
        });
        if(this.gold_pay >= gold)
            this.gold_pay = this.gold_pay - gold
        else if(this.gold_pay >= 0)
            this.gold_pay = 0
        return true;
    }

    decGold_EX(gold, way, ext){
        gold = Number(gold)
        let pay = 1
        if(Number.isNaN(gold)) return -1;
        if(gold <= 0) return -1;
        if(this.gold < gold) return -1;
        let gold_free = this.gold - this.gold_pay;
        if (gold_free < gold && this.gold_pay < gold){
            let ret = this.decGold(gold, way, ext);
            if (!ret) { return -1} else {return 2}
        } else if (this.gold_pay >= gold_free){
            if (this.gold_pay >= gold) {
                this.gold_pay = this.gold_pay - gold
                pay = 2
            }
        }
        this.gold = this.gold - gold;
        if (ext == null) ext = "";
        this.total_cost = this.total_cost + gold
        g_App.playerRedis.evalsha("dp_gold_change", 0, this.id, 
            way, new Date().toLocaleString(), -gold, this.gold, ext, function(err, ret){
            if(err) return console.log(err)
        });
        return pay;
    }

    incRedbag(redbag, way, ext){
        redbag = Number(redbag)
        if(Number.isNaN(redbag)) return false;
        if(redbag <= 0) return false;
        this.redbag = this.redbag + redbag
        if(ext == undefined) ext = "";
        g_App.playerRedis.evalsha("dp_redbag_get", 0, this.id, 
            way, new Date().toLocaleString(), redbag, ext, this.redbag, function(err, ret){
            if(err) return console.log(err)
        })
        return true;
    }

    decRedbag(redbag, way, ext){
        redbag = Number(redbag)
        if(Number.isNaN(redbag)) return false;
        if(redbag <= 0) return false;
        if(this.redbag < redbag) return false;
        this.redbag = this.redbag - redbag;
        g_App.playerRedis.evalsha("dp_redbag_cost", 0, this.id,
            way, new Date().toLocaleString(), redbag, ext, this.redbag, function(err, ret){
            if(err) return console.log(err)
        })
        return true;
    }

    incGrowth(growth, way, ext){
        growth = Number(growth)
        if(Number.isNaN(growth)) return false;
        if(growth <= 0) return false;
        this.growth = this.growth + growth
        return true;
    }
    
    decGrowth(growth, way, ret){
        growth = Number(growth)
        if(Number.isNaN(growth)) return false;
        if(growth <= 0) return false;
        if(this.growth < growth) return false;
        this.growth = this.growth - growth;
        return true;
    }

    incCatchTicket(ticket, way, ext){
        ticket = Number(ticket)
        if(Number.isNaN(ticket)) return false;
        if(ticket <= 0) return false;
        this.catch_ticket = this.catch_ticket + ticket
        return true;
    }

    decCatchTicket(ticket, way, ext){
        ticket = Number(ticket)
        if(Number.isNaN(ticket)) return false;
        if(ticket <= 0) return false;
        if(this.catch_ticket < ticket) return false;
        this.catch_ticket = this.catch_ticket - ticket;
        return true;
    }

    incHoodle(hoodle, way, ext){
        hoodle = Number(hoodle)
        if(Number.isNaN(hoodle)) return false;
        if(hoodle <= 0) return false;
        this.hoodle = this.hoodle + hoodle
        if (ext == null) ext = "";
        g_App.playerRedis.evalsha("dp_hoodle_change", 0, this.id, 
            way, new Date().toLocaleString(), hoodle, this.hoodle , ext, function(err, ret){
            if(err) return console.log(err)
        });
        return true;
    }

    decHoodle(hoodle, way, ext){
        ext = ext.toString()
        hoodle = Number(hoodle)
        if(Number.isNaN(hoodle)) return false;
        if(hoodle <= 0) return false;
        if(ext.match("ddz")){
            if(this.hoodle < hoodle){
                this.hoodle = 0
            }else{
                this.hoodle = (this.hoodle - hoodle).toFixed(1);
            }
        }else{
            if(this.hoodle < hoodle) return false;
            this.hoodle = this.hoodle - hoodle;
        }
        if (ext == null) ext = "";
        g_App.playerRedis.evalsha("dp_hoodle_change", 0, this.id, 
            way, new Date().toLocaleString(), -hoodle, this.hoodle, ext, function(err, ret){
            if(err) return console.log(err)
        });
        return true;
    }

    incGame_redbag(game_redbag, way, ext){
        game_redbag = Number(game_redbag)
        if(Number.isNaN(game_redbag)) return false;
        if(game_redbag <= 0) return false;
        this.game_redbag = this.game_redbag + game_redbag
        if (ext == null) ext = "";
        g_App.playerRedis.evalsha("dp_game_redbag_change", 0, this.id, 
            way, new Date().toLocaleString(), game_redbag, this.game_redbag , ext, function(err, ret){
            if(err) return console.log(err)
        });
        return true;
    }

    decGame_redbag(game_redbag, way, ext){
        game_redbag = Number(game_redbag)
        if(Number.isNaN(game_redbag)) return false;
        if(game_redbag <= 0) return false;
        if(this.game_redbag < game_redbag) return false;
        this.game_redbag = this.game_redbag - game_redbag;
        if (ext == null) ext = "";
        g_App.playerRedis.evalsha("dp_game_redbag_change", 0, this.id, 
            way, new Date().toLocaleString(), -game_redbag, this.game_redbag, ext, function(err, ret){
            if(err) return console.log(err)
        });
        return true;
    }

    startGetCmdListening(){
        let self = this
        g_App.gamecomRedis.call("lpop", "cmd_list_" + this.id, function(err, ret){
            if(err) return console.log(err);

            if(ret != null){
                g_App.log_pay.info(`${ret}`)
                let jret = JSON.parse(ret)
                let json = JSON.parse(jret.json)
                if(jret.type == "add_gold"){
                    self.incGold(json.gold, json.way)
                    if(json.tips != null) self.sendMsgBox(json.tips + ",金币增加" + json.gold);
                }
                if(jret.type == "add_hoodle"){
                    self.incHoodle(json.hoodle, json.way)
                    if(json.tips != null) self.sendMsgBox(json.tips + ",硬币增加" + json.hoodle);
                }
                else if(jret.type == "add_score"){
                    self.incScore(json.score, json.way, json.toy)
                }
                else if(jret.type == "auto_add"){
                    if(json.auto_type == "gold"){
                        self.incGold(json.auto_val, json.way, json.toy)
                    }
                    else if(json.auto_type == "score"){
                        self.incScore(json.auto_val, json.way, json.toy)
                    }
                    else if(json.auto_type == "redbag"){
                        self.incRedbag(json.auto_val, json.way, JSON.stringify({ cfg : json.toy}) )
                    }
                }
                else if(jret.type == "pay"){
                    g_App.gamecomRedis.evalsha("dp_get_cfg_pay", 0, json.product_id, function(err, ret){
                        if(err) { 
                            g_App.log_pay_error.error(`${JSON.stringify(jret)}:${err}`)
                            return console.log(err);
                        }
                        if(ret == null) {
                            let error_info = `${json.product_id} cfg is null`
                            g_App.log_pay_error.error(error_info)
                            return console.log(error_info)
                        }

                        let jret = JSON.parse(ret)

                        if(Number(json.amount) != Number(jret.amount)) {
                            let error_info = `${json.product_id} amount error: ${json.amount} ${jret.amount}`
                            g_App.log_pay_error.error(error_info)
                            return console.log(error_info)
                        }

                        if(jret.charge_type == "hoodle"){
                            self.incHoodle(jret.gold, '充值', ret)
                            self.total_charge_hoodle = self.total_charge_hoodle + Number(jret.amount);
                            g_App.gamecomRedis.call("HINCRBY","charge_hoodle_data", self.id, jret.amount);
                        } else {
                            let way = "充值"
                            let msg = "充值到账 金币增加"
                            //标志位第一位为首充标志
                            if ( jret.flag != null && jret.flag != '' ){
                                let flag = self.pay_flag.toString(2);
                                if (flag  >> (Number(jret.flag) - 1) & 1 == 1){ // (data >> i-1) & 1  取第i位
                                    jret.gold = Number(json.amount) * 10
                                } else {
                                    way = "首充"
                                    msg = "首次充值到账 金币增加"
                                    flag ^= (1 << (Number(jret.flag) - 1)) // data ^= (1 << ( i - 1 ))  i位取反
                                    self.pay_flag = parseInt(flag,2)
                                }
                            }
                            self.on_player_pay(Number(json.amount))
                            self.incGold(jret.gold, way, ret);
                            //增加玩家的充值金币
                            self.gold_pay = self.gold_pay + Number(json.amount) * 10
                            self.sendMsgBox(msg + jret.gold)
                            //充值邀请送娃娃
                            let message = {pid: self.id, amount: Number(json.amount)}
                            g_App.gamecomRedis.call("PUBLISH","change_invitation_charge_data", JSON.stringify(message), function(err,ret){
                                if(err) return console.log(err);
                            });
                        }
                    });
                }
                else if(jret.type == "catch_succ"){
                    self.total_catch_succ = self.total_catch_succ + 1
                }
                self.startGetCmdListening();
            }
        });
    }

    startGetH5FinishedListening_SD(){
        let self = this
        g_App.gameH5Redis.call("lpop", "h5_sd_finished_" + this.id, function(err, ret){
            if(err) return console.log(err);

            if(ret != null) {
                let jret = JSON.parse(ret)
                let org_gold = Number(jret.org_gold)
                let gold = Number(jret.gold)
                if(org_gold > gold){
                    let dec_gold = org_gold - gold
                    if(dec_gold > self.gold){
                        self.decGold(self.gold, "卡通抓娃娃结算"); 
                    }
                    else { 
                        self.decGold(dec_gold, "卡通抓娃娃结算"); 
                    }
                }
                else if(org_gold < gold)
                    self.incGold(gold - org_gold, "卡通抓娃娃结算");

                let redbag = Number(jret.redbag)
                self.incRedbag(redbag, '卡通抓娃娃获得红包', '')

                self.startGetH5FinishedListening_SD();
            }
        });
    }


    get_catch_prob(jtoy_cfg){
        let numerator = Number(jtoy_cfg.numerator)
        let denominator = Number(jtoy_cfg.denominator)
        //玩家的第一抓，一定抓不到，概率为0
        if(this.total_catch == 0) return { numerator : 1,  denominator : 200 };
        //如果玩家身上有充值的金币，则概率为配置表
        if(this.gold_pay > 0) {
            let pay_prob = jtoy_cfg.pay_prob
            if(pay_prob != null && pay_prob != ""){
                let pay_probs = pay_prob.split(",")
                if(pay_probs.length == 2){
                    let pay_numerator = Number(pay_probs[0])
                    let pay_denominator = Number(pay_probs[1])
                    return { numerator : pay_numerator,  denominator : pay_denominator };
                }
                else{
                    console.log(`toy ${jtoy_cfg.name} cfg prob is error ->${pay_prob}`)
                }
            }
            
            return { numerator : numerator,  denominator : denominator };
        }
        //然后看服务器，水线。这里的逻辑是看服务器利润，如果服务器的利润小于设置的值。则使用免费金币的情况下，概率为0
        //否则，则为正常的配置表里面的概率，当
        if(g_App.cfg_game_control != null && g_App.cfg_global != null 
            && g_App.cfg_global.water_line != null
            && Number(g_App.cfg_global.water_line) != 0){
            let profits = g_App.cfg_game_control.profits == null ? 0 : Number(g_App.cfg_game_control.profits);
            let water_line = g_App.cfg_game_control.water_line == null ? Number(g_App.cfg_global.water_line) : Number(g_App.cfg_game_control.water_line);
            //服务器利润小于水线值
            if(profits <= water_line){
                if(water_line <= 0){
                    g_App.gamecomRedis.call("hset", "game_server_control", "water_line", g_App.cfg_global.water_line, function(err, ret){
                        if(err) return console.log(err);
                    });
                }

                g_App.log_control.info(`control ${this.id} toy_name: ${jtoy_cfg.name} cur_profits: ${profits} cur_water_line:${water_line} `)
                return { numerator : 1,  denominator : 200 };
            }
            else if(profits >= water_line){
                if(water_line > 0){
                    g_App.gamecomRedis.call("hset", "game_server_control", "water_line", 0, function(err, ret){
                        if(err) return console.log(err);
                    });   
                }
            }
        }

        return { numerator : numerator,  denominator : denominator };
    }   
}

module.exports = Player;