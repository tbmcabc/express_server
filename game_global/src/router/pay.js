const express = require('express')
const crypto = require("crypto")
let router = express.Router();

function toMd5(data){
	data = new Buffer(data).toString("utf8");
	return crypto.createHash('md5').update(data).digest('hex').toLowerCase();
}

function CreateMd5(argv) {
    var val = argv.amount  + argv.channel_number + argv.channel_order_id + argv.channel_product_id + argv.enhanced_sign + 
              argv.game_id + argv.game_user_id   + argv.order_id + argv.order_type + argv.pay_status + argv.pay_time +
              argv.plugin_id + argv.private_data + argv.product_count + argv.product_id +
              argv.product_name + argv.server_id + argv.source + argv.user_id;
    
    return val;
}


router.post("/pay_notify", function(req, res, next){ 

    let target = {
        amount                  : req.body.amount,
        channel_number          : req.body.channel_number,
        channel_order_id        : req.body.channel_order_id,
        channel_product_id      : req.body.channel_product_id,
        game_id                 : req.body.game_id,
        game_user_id            : req.body.game_user_id,
        order_id                : req.body.order_id,
        order_type              : req.body.order_type,
        pay_status              : req.body.pay_status,
        pay_time                : req.body.pay_time,
        private_data            : req.body.private_data,
        product_count           : req.body.product_count,
        plugin_id               : req.body.plugin_id,
        product_id              : req.body.product_id,
        product_name            : req.body.product_name,
        server_id               : req.body.server_id,
        user_id                 : req.body.user_id,
        source                  : req.body.source,
        enhanced_sign           : req.body.enhanced_sign,
        sign                    : req.body.sign
    }
    let str_target = JSON.stringify(target)
    g_App.log_pay.info(str_target)
    if (target.pay_status != "1")
        return res.send('fail1');

    let val  = CreateMd5(target);

    const appkey = '18A91023804B6489C35CF0FDD541430C';
    if (target.sign != toMd5(toMd5(val) + appkey))
        return res.send("sign is error")


    let strSql = "insert into t_order(`order_id`, `amount`, `product_id`, `product_name`, `game_id`, `game_user_id`, `pay_status`, `pay_time`, `plugin_id`, `private_data`, `server_id`,`user_id`,`order_type`, `channel_number`,`channe_order_id`,`save_time`)" +
    " values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,now())";
    g_App.mysqlCli.query(strSql, [target.order_id, target.amount, target.product_id, 
        target.product_name, target.game_id, target.game_user_id, target.pay_status , target.pay_time ,
         target.plugin_id, target.private_data, target.server_id, target.user_id, target.order_type,
          target.channel_number, target.channe_order_id], function(err, ret){
        if(err) {
          g_App.log_sys_error.error(`${JSON.stringify(target)}:${err}`)
          return console.log(err);
        }

        let order = {}
        order.order_id = target.order_id
        order.dbid = 1
        order.pid = target.user_id
        order.product_id = target.product_id
        order.plat_id = target.channel_number
        order.channel = "d2eam_pay"
        order.amount = target.amount

        g_App.gamecomRedis.evalsha("gy_add_player_cmd", 0, order.pid, "pay", JSON.stringify(order), function(err, ret){
            if(err) return console.log(err);

            g_App.log_pay_succ.info(str_target)
        });

        g_App.gamecomRedis.call("HINCRBY", "game_server_control", "profits", Number(target.amount) * 100, function(err, ret){
            if(err) return console.log(err);          
        });
    });

    res.send("ok")
});

module.exports = router;