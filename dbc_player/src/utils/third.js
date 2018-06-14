
class ThirdSystem{
	constructor(){

	}

	get_third_cmd(msg){
		let jmsg = JSON.parse(msg)
		let key = "on_" + jmsg.op
		let func = this[key]
		if(func != null) func.call(this, jmsg);
		else{
			this.reply_to_third(jmsg.key, { ret_code : -1, ret_msg : "not found hander!"})
		}
	}

	on_get_user_info(jmsg){
		let self = this;
		g_App.playerManager.getPlayerCacheByID(jmsg.params.pid, function(err, sp){
			if(err) return console.log(err);
			if(sp == null) return;

			self.reply_to_third(jmsg.key, {
				ret_code : 0,
				nick_name : sp.nick_name,
				head_img : sp.head_img,
				gold : sp.gold
			});
		});
	}

	on_get_user_hoodle(jmsg){
		let self = this;
		g_App.playerManager.getPlayerCacheByID(jmsg.params.pid, function(err, sp){
			if(err) return console.log(err);
			if(sp == null) return;

			self.reply_to_third(jmsg.key, {
				ret_code : 0,
				hoodle : sp.hoodle *10,
				game_redbag : sp.game_redbag
			});
		});
	}

	on_settlement(jmsg){
		let self = this;
		g_App.playerManager.getPlayerCacheByID(jmsg.params.pid, function(err, sp){
			if(err) return console.log(err);
			if(sp == null) return;

			if(sp.gold != Number(jmsg.params.gold)){
				return self.reply_to_third(jmsg.key, {
					ret_code : -1,
					ret_msg : "gold is not match"
				});
			}
			let win = Number(jmsg.params.win)
			if(win > 0){
				sp.incGold(win, "第三方结算", {});
				return self.reply_to_third(jmsg.key, {
					ret_code : 0,
					gold : sp.gold
				});
			}
			else{
				if(sp.decGold(-win, "第三方结算", {}) == false){
					return self.reply_to_third(jmsg.key, {
						ret_code : 0,
						ret_msg : "win is error"
					});
				}
				self.reply_to_third(jmsg.key, {
					ret_code : 0,
					gold : sp.gold
				});
			}			
		});
	}

	on_ddz_game_result(jmsg){
		let self = this;
		let way = ""
		g_App.playerManager.getPlayerCacheByID(jmsg.params.pid, function(err, sp){
			if(err) return console.log(err);
			if(sp == null) return;
			if (jmsg.params.op == "dec_hoodle"){
				let str = jmsg.params.way
				if(str.match("扣桌费")){
					way = "红包斗地主_扣桌费";
				}else{
					way = "红包斗地主_结算";
				}
				sp.decHoodle((Number(jmsg.params.count)/10),way,"ddz" + jmsg.params.play_id.toString())
			}else if(jmsg.params.op == "add_game_redbag"){
				way = "红包斗地主";
				sp.incGame_redbag(jmsg.params.count,way, jmsg.params.play_id.toString())
			}
			self.reply_to_third(jmsg.key, {
				ret_code : 0,
				hoodle : sp.hoodle * 10,
				game_redbag : sp.game_redbag
			});
		
		});
	}

	reply_to_third(key, ret){
		 g_App.gamecomRedis.call("publish", "reply_third_cmd_notify", 
            JSON.stringify({
                key : key,
                ret : ret
        }),function(err, ret){
        	if(err) return console.log(err);
        });
	}
}

module.exports = ThirdSystem;