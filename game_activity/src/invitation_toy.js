class invitationtoySystem{
	constructor(){

	}

	changeCharge(msg){
		let jmsg = JSON.parse(msg)
		g_App.gamecomRedis.evalsha("dp_set_invitingact_chargedata", 0, jmsg.pid, jmsg.amount, function(err, ret){
				if(err) return console.log("invitingact_chargedata", err);
		});
	}

	changeInvite(msg){
		let jmsg = JSON.parse(msg)
		g_App.gamecomRedis.evalsha("dp_set_invitingact_invitedata", 0, jmsg.pid, function(err, ret){
			if(err) return console.log("invitingact_invitedata", err);
		});
	}

	changeCatch(msg){
		let jmsg = JSON.parse(msg)
		g_App.gamecomRedis.evalsha("dp_set_invitingact_catchdata", 0, jmsg.pid, jmsg.catch_num, jmsg.type,function(err, ret){
			if(err) return console.log("invitingact_catchdata", err);
		});
	}

}

module.exports = invitationtoySystem;