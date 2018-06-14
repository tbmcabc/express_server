require("../config")
const redis = require('redis')

let scripts = {}

scripts.gg_player_online = `
    local pid = ARGV[1]
    local dbid = ARGV[2]
    local ggid = ARGV[3]
    local token = ARGV[4]

    local auth_key = "login_auth_"..pid
    redis.call("hset", auth_key, "dbid", dbid)
    redis.call("hset", auth_key, "token", token)

    redis.call("publish", "player_online", cjson.encode({ pid = pid, ggid = ggid } ))
`

scripts.gg_player_offline = `
    local pid = ARGV[1]

    local auth_key = "login_auth_"..pid

    --redis.call("del", auth_key)
    redis.call("publish", "player_offline", cjson.encode({ pid = pid } ))
`

scripts.gy_load_toys_room = `
    local toy_id = ARGV[1]
    local pid = ARGV[2]
    local rids = redis.call("hget", "cfg_toy_room_set", toy_id)
    if not rids then return "{}" end

    local rooms = {}
    local jrids = cjson.decode(rids)
    for i = 1, #jrids do
        rooms[#rooms + 1] = { rid = jrids[i], cfg = redis.call("hget", "cfg_toy_room", jrids[i]) }
    end

    if pid ~= "" then
        local values = {
            pid = pid,
            toy_id = toy_id,
            cnt = 1
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_click_toy_log",
            model = "add_date_cnt",
            values = values
        }))
    end

    return cjson.encode({ data = rooms })
`

scripts.gy_get_catch_result = `
    local pid = ARGV[1]
    local rid = ARGV[2]
    local nick_name = ARGV[3]
    local head_img = ARGV[4]

    --local cfg_room = redis.call("hget", "cfg_toy_room", rid)
    --if not cfg_room then return -1 end

    --local jcfg = cjson.decode(cfg_room)
    --local cfg_toy = redis.call("hget", "cfg_toy", jcfg.toy_id)
    --if not cfg_toy then return -2 end

    --local jcfg_toy = cjson.decode(cfg_toy)

    local cmd_key  = "cmd_list_"..pid

    redis.call("lpush", cmd_key, cjson.encode({ type = "catch_succ", json = cjson.encode({})}))

    redis.call("publish", "add_cmd_notify", pid)

    --redis.call("RPUSH", "last_five_luck", cjson.encode({head_img = head_img, txt = "恭喜玩家"..nick_name.."抓到了"..jcfg_toy.name, toy_img = jcfg_toy.img }))
    --redis.call("LTRIM", "last_five_luck", -5, -1)

    --redis.call("publish", "send_msg_to_all", cjson.encode({ op = "luck_wall", head_img = head_img, txt = "恭喜玩家"..nick_name.."抓到了"..jcfg_toy.name, toy_img = jcfg_toy.img }))
    --redis.call("publish", "send_msg_to_all", cjson.encode({ op = "room_catch_log", log = cjson.encode({ head_img = head_img, nick_name = nick_name}) }))
`
scripts.gy_exchange_goods = `
    local goods_id = ARGV[1]

    local cfg_mall = redis.call("hget", "cfg_mall", goods_id)
    if not cfg_mall then return -1 end

    local jcfg = cjson.decode(cfg_mall)
    if jcfg.type == "JD" then
        if redis.call("EXISTS", "JD_CARDS_"..jcfg.value) == 0 then
            --错误码-1表示没有库存了
            return -1
        end
    elseif jcfg.type == "QB" then
        if redis.call("EXISTS", "QB_CARDS_"..jcfg.value) == 0 then
            --错误码-1表示没有库存了
            return -1
        end
    end
    return cjson.encode({ score = jcfg.price, name = jcfg.name,
     img = jcfg.img, type = jcfg.type, value = jcfg.value })

`
scripts.gy_exchange_jd_cards = `
    local pid = ARGV[1]
    local value = ARGV[2]
    local time = ARGV[3]

    local jd_key = "JD_CARDS_"..value
    local card_pwd = redis.call("lpop", jd_key)
    if not card_pwd then return -1 end

    --push给gameToy，说这个玩家领取了京东卡，把数据爬到mysql里面去
    local cmd = {}
    cmd.type = "exchange_jd_cards"
    cmd.card_pwd = card_pwd
    cmd.pid = pid
    cmd.time = time

    --gameToy命令
    redis.call("lpush", "cmd_game_toy_list", cjson.encode(cmd))
    redis.call("publish", "get_game_toy_cmd_notify", "")

    return card_pwd
`

scripts.gy_exchange_qb_cards = `
    local pid = ARGV[1]
    local value = ARGV[2]
    local time = ARGV[3]

    local jd_key = "QB_CARDS_"..value
    local card_pwd = redis.call("lpop", jd_key)
    if not card_pwd then return -1 end

    --push给gameToy，说这个玩家领取了QB卡，把数据爬到mysql里面去
    local cmd = {}
    cmd.type = "exchange_qb_cards"
    cmd.card_pwd = card_pwd
    cmd.pid = pid
    cmd.time = time

    --gameToy命令
    redis.call("lpush", "cmd_game_toy_list", cjson.encode(cmd))
    redis.call("publish", "get_game_toy_cmd_notify", "")

    return card_pwd
`

scripts.gy_exchange_hf_cards = `
    local pid = ARGV[1]
    local value = ARGV[2]
    local phone = ARGV[3]
    local time = ARGV[4]

    --push给gameToy，说这个玩家领取了花费，把数据爬到mysql里面去
    local cmd = {}
    cmd.type = "exchange_hf_cards"
    cmd.value = value
    cmd.pid = pid
    cmd.phone = phone
    cmd.time = time
    
    --gameToy命令
    redis.call("lpush", "cmd_game_toy_list", cjson.encode(cmd))
    redis.call("publish", "get_game_toy_cmd_notify", "")
`

scripts.gy_add_player_cmd = `
    local pid = ARGV[1]
    local type = ARGV[2]
    local json = ARGV[3]

    local cmd_key  = "cmd_list_"..pid

    redis.call("lpush", cmd_key, cjson.encode({ type = type, json = json}))

    redis.call("publish", "add_cmd_notify", pid)
`


scripts.gy_random_luck_wall = `
    local ts = ARGV[1]
    math.randomseed(ts)

    --首先随机人
    local robot_cnt_cfg = redis.call("hget", "cfg_robot", "0")
    local jr_cnt_cfg = cjson.decode(robot_cnt_cfg)
    local max_robot_cnt = tonumber(jr_cnt_cfg.nick_name)
    local cfg_robot = redis.call("hget", "cfg_robot", math.random(1, max_robot_cnt))
    if not cfg_robot then return end

    local jcfg_robot = cjson.decode(cfg_robot)

    --再随机文字
    local txt_cnt_cfg = redis.call("hget", "cfg_luck_wall", "0")
    local jtxt_cnt_cfg = cjson.decode(txt_cnt_cfg)
    local max_txt_cnt = tonumber(jtxt_cnt_cfg.txt)

    local cfg = redis.call("hget", "cfg_luck_wall", math.random(1, max_txt_cnt))
    if not cfg then return end
    local jcfg = cjson.decode(cfg)

    --最后随机娃娃
    local cfg_cnt_toy = redis.call("hget", "cfg_robot_toy", "0")
    local jtoy_cnt_cfg = cjson.decode(cfg_cnt_toy)

    local max_toy_cnt = tonumber(jtoy_cnt_cfg.name)

    local cfg_toy = redis.call("hget", "cfg_robot_toy", math.random(1, max_toy_cnt))
    if not cfg_toy then return end
    local jcfg_toy = cjson.decode(cfg_toy)

    local txt = string.gsub(jcfg.txt, "NICK_NAME", jcfg_robot.nick_name)
    txt = string.gsub(txt, "TOY_NAME", jcfg_toy.name)

    redis.call("publish", "send_msg_to_all", cjson.encode({ op = "luck_wall", 
        head_img = jcfg_robot.head_img,
        txt = txt,
        toy_img =  jcfg_toy.img}))

    redis.call("RPUSH", "last_five_luck", cjson.encode({head_img = jcfg_robot.head_img, txt = txt, toy_img = jcfg_toy.img }))
    redis.call("LTRIM", "last_five_luck", -30, -1)
`

scripts.gy_get_room_and_toy_cfg = `
    local rid = ARGV[1]

    local room_data = redis.call("hget", "cfg_toy_room", rid)
    if not room_data then return -1 end

    local jrdata = cjson.decode(room_data)
    local toy_cfg = redis.call("hget", "cfg_toy", jrdata.toy_id)
    return cjson.encode({price = jrdata.price, live_id = jrdata.live_id, toy_id = jrdata.toy_id, toy_cfg = toy_cfg})
`

scripts.gy_get_home_data = `
    local position = ARGV[1]
    local plat_id = ARGV[2]
    local banner_key  = "cfg_"..position.."_banner"
    local array = redis.call('hgetall', banner_key)
    local ret = {}

    ret.banners = {}
    for i=1,#array,2 do
        local v = array[i+1]
        local jbanner = cjson.decode(v)
        if jbanner.in_plat ~= nil and jbanner.out_plat ~= nil then
            if (jbanner.in_plat == "" or (plat_id ~= "" and string.find(jbanner.in_plat, plat_id) ~= nil)) and
               (jbanner.out_plat == "" or string.find(jbanner.out_plat, plat_id) == nil) then
                ret.banners[#ret.banners + 1] = v
            end
        else
            ret.banners[#ret.banners + 1] = v
        end
    end
    if plat_id == "" then
        ret.pays = cjson.decode(redis.call("get", "cfg_pay_client"))
    else
        ret.pays = {}
        local array_pay = cjson.decode(redis.call("get", "cfg_pay_client"))
        for k ,v in pairs(array_pay) do
            local jpay = cjson.decode(v)
            if (jpay.in_plat == "" or string.find(jpay.in_plat, plat_id) ~= nil) 
                and (jpay.out_plat == "" or string.find(jpay.out_plat, plat_id) == nil) then
                ret.pays[#ret.pays + 1] = v
            end
        end
    end
    local array_paid = redis.call('hgetall', "cfg_paid")
    ret.paids = {}
    for i=1,#array_paid,2 do
        ret.paids[#ret.paids + 1] = array_paid[i+1]
    end
    ret.luck_walls = redis.call("LRANGE", "last_five_luck", -30, -1)
    return cjson.encode(ret)
`

scripts.gy_update_jd_cards = `
    local json = cjson.decode(ARGV[1])

    for k,v in pairs(json) do
        local jd_key = "JD_CARDS_"..k
        redis.call("del", jd_key)
        for i = 1, #v do
            redis.call("lpush", jd_key, v[i])
        end
    end
`

scripts.gy_update_qb_cards = `
    local json = cjson.decode(ARGV[1])

    for k,v in pairs(json) do
        local jd_key = "QB_CARDS_"..k
        redis.call("del", jd_key)
        for i = 1, #v do
            redis.call("lpush", jd_key, v[i])
        end
    end
`

scripts.gy_get_toy_redbag = `
    local ret = {}

    ret.redbag = {}
    ret.toys = {}

    local toys_map = nil
    local array = redis.call("hgetall", "cfg_toy_redbag")
    for i=1,#array,2 do
        if array[i] == "toys_map" then toys_map = cjson.decode(array[i+1]) 
        else
            ret.redbag[#ret.redbag + 1] = array[i+1]
        end
    end

    if not toys_map then return cjson.encode({ ret_code = -1, ret_msg = "配置加载错误" }) end

    for i=1, #toys_map do
        local toy_id = toys_map[i]
        local cfg_toy = redis.call("hget", "cfg_toy", toy_id)
        if not cfg_toy then return cjson.encode({ ret_code = -2, ret_msg = "配置加载错误" + toy_id }) end
        ret.toys[toy_id] = cfg_toy
    end

    return cjson.encode(ret)
`

scripts.dp_get_cfg_pay = `
    local product_id = ARGV[1]
    local cfg_pay = redis.call("hget", "cfg_pay", product_id) or nil
    return cfg_pay
`

scripts.dp_cal_vip = `
    local charge = ARGV[1]

    for i=7, 1, -1 do
        local cfg = redis.call("hget", "cfg_vip", i)
        if cfg then
            local jcfg = cjson.decode(cfg)
            if tonumber(charge) >= tonumber(jcfg.charge) then
                return i
            end
        end
    end

    return 0
`

scripts.gy_check_free_gold = `
    local split = function(input, delimiter)
        input = tostring(input)
        delimiter = tostring(delimiter)
        if (delimiter=='') then return false end
        local pos,arr = 0, {}
        for st,sp in function() return string.find(input, delimiter, pos, true) end do
            table.insert(arr, string.sub(input, pos, st - 1))
            pos = sp + 1
        end
        table.insert(arr, string.sub(input, pos))
        return arr
    end

    local pid = ARGV[1]
    local today_ts = tonumber(ARGV[2])
    local ts = ARGV[3]
    local now_date = ARGV[4]
    local way = ARGV[5]

    local all_keys = split(redis.call("hget", "cfg_free_gold", "all_keys"), ",")
    local pre_ts = 0
    local pre_cfg = ""
    local aft_ts = 0
    for k, begin_ts in pairs(all_keys) do 
        begin_ts = tonumber(begin_ts)
        if today_ts > begin_ts then 
            pre_ts = begin_ts 
            pre_cfg = redis.call("hget", "cfg_free_gold", begin_ts)
        elseif today_ts < begin_ts then
            aft_ts = begin_ts
            break
        end
    end

    local warehouse = 0
    if pre_ts == 0 then
        redis.call("del", "free_gold_warehouse")
    else
        local now_free_key = now_date.."-"..pre_ts
        local redis_free_key = redis.call("hget", "free_gold_warehouse", "key") or ""
        if now_free_key ~= redis_free_key then
            pre_cfg = cjson.decode(pre_cfg)

            redis.call("del", "free_gold_warehouse")    
            redis.call("hset", "free_gold_warehouse", "key", now_free_key)
            redis.call("hset", "free_gold_warehouse", "warehouse", pre_cfg.total_gold)
            redis.call("hset", "free_gold_warehouse", "min_get", pre_cfg.min_gold)
            redis.call("hset", "free_gold_warehouse", "max_get", pre_cfg.max_gold)
        end

        warehouse = tonumber(redis.call("hget", "free_gold_warehouse", "warehouse")) or 0
    end

    if way == "Enter" then

        local values = {
            pid = pid,
            cnt = 1
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_click_gold_rain_log",
            model = "add_date_cnt",
            values = values
        }))

        local ret = {}
        ret.describe = redis.call("get", "cfg_free_gold_client")

        --当前时段存库大于0并且玩家没有领取过当前时段的免费金币
        if warehouse > 0 and redis.call("hexists", "free_gold_warehouse", pid) == 0 then
            ret.left_ts = 0
            return cjson.encode(ret)
        end

        --如果after_ts为0，则表明今天的免费金币已经抢完了
        if aft_ts == 0 then
            ret.left_ts = -1
            return cjson.encode(ret)
        end

        ret.left_ts = aft_ts - today_ts
        return cjson.encode(ret)
    elseif way == "Get" then
        if pre_ts == 0 then 
            return cjson.encode({ret_code = -1, ret_msg = "活动还未开始"})
        end
        if warehouse <= 0 then
            return cjson.encode({ret_code = -2, ret_msg = "本次金币已经抢完，下次记得手速快点！"})
        end

        if redis.call("hexists", "free_gold_warehouse", pid) == 1 then
           return cjson.encode({ret_code = -2, ret_msg = "你已经领取本时段的金币奖励了！"}) 
        end
        local real_get = 0
        local min_get = tonumber(redis.call("hget", "free_gold_warehouse", "min_get"))
        local max_get = tonumber(redis.call("hget", "free_gold_warehouse", "max_get"))
        math.randomseed(ts)
        local real_get = math.random(min_get, max_get)
        if real_get > warehouse then
            warehouse = 0
        else
            warehouse = warehouse - real_get
        end

        local values = {
            pid = pid,
            real_get = real_get,
            warehouse = warehouse,
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_get_gold_rain_log",
            model = "insert",
            values = values
        }))

        redis.call("hset", "free_gold_warehouse", "warehouse", warehouse)
        redis.call("hset", "free_gold_warehouse", pid, real_get)
        return cjson.encode({ ret_code = 0, real_get = real_get })
    end

    return 0
`

scripts.dp_third_authorization = `
    local pid = ARGV[1]
    local token = ARGV[2]
    local sid = ARGV[3]
    local old_token = redis.call("hget", "third_authorization_token", pid)
    if old_token then redis.call("hdel", "third_authorization_token_val", old_token) end

    redis.call("hset", "third_authorization_token", pid, token)
    redis.call("hset", "third_authorization_token_val", token, cjson.encode({ sid = sid, pid = pid}))
`

scripts.gp_del_xg_push = `
    local pid = ARGV[1]

    redis.call("hdel", "xg_push_offline_map", pid)
    redis.call("hdel", "xg_push_ready_map", pid)
`

scripts.gp_set_xg_push = `
    local pid = ARGV[1]

    redis.call("hset", "xg_push_offline_map", pid, "2")
    redis.call("hdel", "xg_push_ready_map", pid)
`

scripts.gp_update_xg_push = `
    local array = redis.call("hgetall", "xg_push_offline_map")
    for i=1,#array,2 do
        local pid = array[i]
        local cnt = tonumber(array[i+1])
        cnt = cnt - 1
        if cnt <= 0 then
            redis.call("hdel", "xg_push_offline_map", pid)
            redis.call("hset", "xg_push_ready_map", pid, "14")
        else
            redis.call("hset", "xg_push_offline_map", pid, cnt)
        end
    end
`

scripts.gp_get_xg_push = `
    local ret = {}
    local array = redis.call("hgetall", "xg_push_ready_map")
    for i=1,#array,2 do
        local pid = array[i]
        local cnt = tonumber(array[i+1])
        cnt = cnt - 1
        ret[pid] = redis.call("hget", "xg_last_catch_toy_tag", pid) or ""
        if cnt < 0 then
            redis.call("hdel", "xg_push_ready_map", pid)
        else
            redis.call("hset", "xg_push_ready_map", pid, cnt)
        end
    end
    return cjson.encode(ret)
`

//一元夺宝活动相关逻辑
scripts.ga_get_indiana_detail = `
    local pid = ARGV[1]
    local indiana_id = ARGV[2]
    local now_date = ARGV[3]
    local today_ts = tonumber(ARGV[4])

    local cfg = redis.call("hget", "cfg_indiana", indiana_id)
    if not cfg then return cjson.encode({ ret_code = -1, ret_msg = "获取配置失败" }) end

    local jcfg = cjson.decode(cfg)
    
    local begin_time = tonumber(jcfg.begin_time)
    local end_time = tonumber(jcfg.end_time)

    local indiana_key = "indiana_"..indiana_id.."_detail"
    local date = redis.call("hget", indiana_key, "date") or ""
    if date ~= now_date and 
        today_ts >= begin_time and 
        today_ts <= end_time then

        local totla_cnt = tonumber(jcfg.cnt)
        math.randomseed(today_ts)
        redis.call("del", indiana_key)
        redis.call("hset", indiana_key, "date", now_date);
        redis.call("hset", indiana_key, "toy_id", jcfg.toy_id);

        local indiana_left_key = "indiana_"..indiana_id.."_left"
        redis.call("del", indiana_left_key)
        redis.call("del", "indiana_"..indiana_id.."_luck")
        redis.call("del", "indiana_"..indiana_id.."_fake")

        local luck_num_1 = nil
        local luckList = {}
        for i = 1, totla_cnt * 2 do luckList[i] = i end
        for i = 1, totla_cnt do
            local idx = math.random(1, #luckList)
            if luck_num_1 == nil then luck_num_1 = luckList[idx] end
            redis.call("lpush", indiana_left_key, luckList[idx])
            table.remove(luckList, idx)
        end
        for i = 1, totla_cnt do
            local idx = math.random(1, #luckList)
            redis.call("lpush", "indiana_"..indiana_id.."_fake", luckList[idx])
            table.remove(luckList, idx)
        end

        redis.call("hset", indiana_key, "luck_num_1", luck_num_1);
    end

    local ret = {}

    ret.cfg = cfg
    ret.toy_cfg = redis.call("hget", "cfg_toy", jcfg.toy_id)
    ret.cnt = redis.call("hget", indiana_key, "cnt") or 0
    ret.luck_num_1 = redis.call("hget", indiana_key, "luck_num_1") or nil
    ret.luck_num_2 = redis.call("hget", indiana_key, "luck_num_2") or nil
    ret.luck_player_1 = redis.call("hget", indiana_key, "luck_player_1") or nil
    ret.luck_player_2 = redis.call("hget", indiana_key, "luck_player_2") or nil
    ret.self_lucks = redis.call("hget", indiana_key, "PLAYER_"..pid) or "[]"

    if today_ts < begin_time then
        ret.left = begin_time - today_ts + 5
    elseif today_ts < end_time then
        ret.left = 0
    else
        ret.left = begin_time + 24 * 3600 - today_ts + 5
    end

    local values = {
        pid = pid,
        cnt = 1
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month",
        table = "t_open_indiana_ui_log",
        model = "add_date_cnt",
        values = values
    }))

    return cjson.encode(ret)
`

scripts.ga_get_indiana_luck = `
    local pid = ARGV[1]
    local indiana_id = ARGV[2]
    local now_date = ARGV[3]
    local today_ts = tonumber(ARGV[4])
    local nick_name = ARGV[5]
    local head_img = ARGV[6]
    local now_time = ARGV[7]
    local fake = ARGV[8]

    local cfg = redis.call("hget", "cfg_indiana", indiana_id)
    if not cfg then return -1 end

    math.randomseed(today_ts)

    --如果是机器人，则随机一个人出来
    if pid == "ROBOT" then
        local robot_cnt_cfg = redis.call("hget", "cfg_robot", "0")
        local jr_cnt_cfg = cjson.decode(robot_cnt_cfg)
        local cfg_robot = redis.call("hget", "cfg_robot", math.random(1, tonumber(jr_cnt_cfg.nick_name)))
        if not cfg_robot then return end

        local jcfg_robot = cjson.decode(cfg_robot)
        nick_name = jcfg_robot.nick_name
        head_img = jcfg_robot.head_img
    end

    local jcfg = cjson.decode(cfg)

    local begin_time = tonumber(jcfg.begin_time)
    local end_time = tonumber(jcfg.end_time)
    if today_ts < begin_time or today_ts > end_time then return -2 end

    local indiana_key = "indiana_"..indiana_id.."_detail"
    local indiana_left_key = "indiana_"..indiana_id.."_left"
    local indiana_luck_key = "indiana_"..indiana_id.."_luck"
    local date = redis.call("hget", indiana_key, "date") or ""
    if date ~= now_date then
        local totla_cnt = tonumber(jcfg.cnt)
        math.randomseed(today_ts)

        redis.call("del", indiana_key)
        redis.call("hset", indiana_key, "date", now_date);
        redis.call("hset", indiana_key, "toy_id", jcfg.toy_id);

        redis.call("del", indiana_left_key)
        redis.call("del", indiana_luck_key)
        redis.call("del", "indiana_"..indiana_id.."_fake")
        
        local luck_num_1 = nil
        local luckList = {}
        for i = 1, totla_cnt * 2 do luckList[i] = i end
        for i = 1, totla_cnt do
            local idx = math.random(1, #luckList)
            if luck_num_1 == nil then luck_num_1 = luckList[idx] end
            redis.call("lpush", indiana_left_key, luckList[idx])
            table.remove(luckList, idx)
        end
        for i = 1, totla_cnt do
            local idx = math.random(1, #luckList)
            redis.call("lpush", "indiana_"..indiana_id.."_fake", luckList[idx])
            table.remove(luckList, idx)
        end

        redis.call("hset", indiana_key, "luck_num_1", luck_num_1);
    end

    local luck_num = nil
    if fake ~= "1" then
        luck_num = redis.call("lpop", indiana_left_key)
        if not luck_num then return end
        redis.call("sadd", indiana_luck_key, luck_num)

        redis.call("hset", indiana_key, "LUCK_"..luck_num, cjson.encode({ 
            pid = pid, 
            nick_name = nick_name, 
            head_img = head_img }))
        redis.call("HINCRBY", indiana_key, "cnt", 1);
    else
        luck_num = redis.call("lpop", "indiana_"..indiana_id.."_fake")
        if not luck_num then return end
    end
    local values = {
        indiana_id = indiana_id,
        luck_num = luck_num,
        fake = fake
    }
    if pid ~= "ROBOT" then values.pid = pid end
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month",
        table = "t_indiana_get_log",
        model = "insert",
        values = values
    }))

    if pid ~= "ROBOT" then
        local self_lucks = cjson.decode(redis.call("hget", indiana_key, "PLAYER_"..pid) or "[]")
        self_lucks[#self_lucks + 1] = { luck = luck_num, time = now_time }
        redis.call("hset", indiana_key, "PLAYER_"..pid, cjson.encode(self_lucks))
        return 0
    end
`

scripts.ga_before_close_indiana = `
    local indiana_id = ARGV[1]
    local now_date = ARGV[2]

    local indiana_key = "indiana_"..indiana_id.."_detail"
    local date = redis.call("hget", indiana_key, "date") or ""
    if now_date ~= date then return -1 end

    local indiana_luck_key = "indiana_"..indiana_id.."_luck"

    return redis.call("SRANDMEMBER", indiana_luck_key)
`

scripts.ga_close_indiana = `
    local indiana_id = ARGV[1]
    local now_date = ARGV[2]
    local luck_num_2 = ARGV[3]

    local cfg = redis.call("hget", "cfg_indiana", indiana_id)
    local jcfg = cjson.decode(cfg)

    local indiana_key = "indiana_"..indiana_id.."_detail"
    local toy_id = redis.call("hget", indiana_key, "toy_id")
    local toy_cfg = redis.call("hget", "cfg_toy", toy_id)
    local jtoy_cfg = cjson.decode(toy_cfg)

    local indiana_history_key = "indiana_"..indiana_id.."_history"

    local lucks = {}
    local luck_num_1 = redis.call("hget", indiana_key, "luck_num_1")
    if redis.call("hexists", indiana_key, "LUCK_"..luck_num_1) == 1 then
        local str_luck = redis.call("hget", indiana_key, "LUCK_"..luck_num_1)
        local luck_player = cjson.decode(str_luck)
        redis.call("hset", indiana_key, "luck_player_1", str_luck)
        redis.call("lpush", indiana_history_key, cjson.encode({ date = now_date, nick_name = luck_player.nick_name, head_img = luck_player.head_img}))
        if luck_player.pid ~= "ROBOT" then
            if jcfg.type == nil or jcfg.type == "" then
                lucks[#lucks + 1] = luck_player
            else
                local cmd_key  = "cmd_list_"..luck_player.pid
                redis.call("lpush", cmd_key, cjson.encode({ type = "auto_add", 
                    json = cjson.encode({
                        auto_type = jcfg.type,
                        auto_val = jcfg.value,
                        way = '抓抓乐中奖',
                        toy = cjson.encode({ name = jtoy_cfg.name, img = jtoy_cfg.img , playId = indiana_id..'_'..now_date..'_'..luck_num_1})
                    })}))
                redis.call("publish", "add_cmd_notify", luck_player.pid)
            end
        end

        local values = {
            indiana_id = indiana_id,
            luck_num = luck_num_1,
            toy_id = toy_id
        }
        if luck_player.pid ~= "ROBOT" then values.pid = luck_player.pid end
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_indiana_close_log",
            model = "insert",
            values = values
        }))
    end

    redis.call("hset", indiana_key, "luck_num_2", luck_num_2)
    if redis.call("hexists", indiana_key, "LUCK_"..luck_num_2) == 1 then
        local str_luck = redis.call("hget", indiana_key, "LUCK_"..luck_num_2)
        local luck_player = cjson.decode(str_luck)

        redis.call("hset", indiana_key, "luck_player_2", str_luck)
        redis.call("lpush", indiana_history_key, cjson.encode({ date = now_date,  nick_name = luck_player.nick_name, head_img = luck_player.head_img}))

        if luck_player.pid ~= "ROBOT" then
            if jcfg.type == nil or jcfg.type == "" then
                lucks[#lucks + 1] = luck_player
            else
                local cmd_key  = "cmd_list_"..luck_player.pid
                redis.call("lpush", cmd_key, cjson.encode({ type = "auto_add", 
                    json = cjson.encode({
                        auto_type = jcfg.type,
                        auto_val = jcfg.value,
                        way = '抓抓乐中奖',
                        toy = cjson.encode({ name = jtoy_cfg.name, img = jtoy_cfg.img , playId = indiana_id..'_'..now_date..'_'..luck_num_2})
                    })}))
                redis.call("publish", "add_cmd_notify", luck_player.pid)
            end
        end

        local values = {
            indiana_id = indiana_id,
            luck_num = luck_num_2,
            toy_id = toy_id
        }
        if luck_player.pid ~= "ROBOT" then values.pid = luck_player.pid end
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_indiana_close_log",
            model = "insert",
            values = values
        }))
    end
    redis.call("LTRIM", indiana_history_key, 0, 9)
    if #lucks == 0 then return 0 end
        
    return cjson.encode({ lucks = lucks, id = indiana_id, toy_id = toy_id, toy_cfg = toy_cfg })
`


scripts.dp_check_indiana_cfg = `
    local indiana_id = ARGV[1]
    local today_ts = tonumber(ARGV[2])
    local fake = ARGV[3]

    local cfg = redis.call("hget", "cfg_indiana", indiana_id)
    local jcfg = cjson.decode(cfg)

    if today_ts < tonumber(jcfg.begin_time) or today_ts > tonumber(jcfg.end_time) then
        return -1
    end
    local luck = nil
    if fake ~= "1" then
        luck = redis.call("lpop", "indiana_"..indiana_id.."_left") 
        if not luck then return -2 end
    else
        luck = redis.call("lpop", "indiana_"..indiana_id.."_fake") 
        if not luck then return -2 end
    end

    return cjson.encode({
        luck = luck,
        cfg = redis.call("hget", "cfg_toy", jcfg.toy_id) 
    }) 
`

scripts.dp_begin_indiana = `
    local pid = ARGV[1]
    local indiana_id = ARGV[2]
    local playId = ARGV[3]
    local luck = ARGV[4]
    local fake = ARGV[5]

    if playId == "" then
        if fake ~= "1" then
            redis.call("lpush", "indiana_"..indiana_id.."_left", luck)
        else
            redis.call("lpush", "indiana_"..indiana_id.."_fake", luck)
        end
    else
        redis.call("hset", "indiana_catch_map", playId, cjson.encode({
            pid = pid,
            luck = luck,
            indiana_id = indiana_id,
            fake = fake
        }))

        local values = {
            pid = pid,
            indiana_id = indiana_id,
            fake = fake
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_indiana_catch_log",
            model = "insert",
            values = values
        }))
    end
`

scripts.dp_end_indiana = `
    local pid = ARGV[1]
    local playId = ARGV[2]
    local indiana_id = ARGV[3]

    local play = redis.call("hget", "indiana_catch_map", playId)
    if not play then return -1 end

    local jplay = cjson.decode(play)
    if jplay.pid ~= pid or jplay.indiana_id ~= indiana_id then 
        return -2
    end

    redis.call("hdel", "indiana_catch_map", playId)

    if jplay.fake ~= "1" then
        redis.call("lpush", "indiana_"..indiana_id.."_left", jplay.luck)   
    else
        redis.call("lpush", "indiana_"..indiana_id.."_fake", jplay.luck)   
    end
    return play
`


//充值邀请送娃娃逻辑

scripts.gy_get_invitingact_info = `
    local pid = ARGV[1]

    local info = redis.call("hvals" , "cfg_invitingact")
    if not info then return -1 end

    local inum = tonumber(redis.call("hget" , "invitingact_invitedata", pid)) or 0
    local cnum = tonumber(redis.call("hget" , "invitingact_chargedata", pid)) or 0

    local cfg = {}
    local discribe = ''

    for i=1, #info do
        local jinfo = cjson.decode(info[i])
        local status = tonumber(redis.call("hget" , "invitingact_acttoy"..jinfo.id.."status", pid)) or 0

        if status ~= 2  then
            if cnum >= tonumber(jinfo.charge_num) and inum >= tonumber(jinfo.invite_num) then
                status = 1
            else
                status = 0
            end
            redis.call("hset" , "invitingact_acttoy"..jinfo.id.."status", pid, status)
        end
        
        discribe = jinfo.describe
        local tcfg =  {
            info = jinfo,
            toycfg = redis.call("hget", "cfg_toy", jinfo.toy_id),
            status = status
        }
        cfg[#cfg + 1] = tcfg
    end

    return cjson.encode({
        invitenum = inum,
        chargenum = cnum,
        actinfo = cfg,
        discribe = discribe,
    }) 
`

scripts.dp_set_invitingact_chargedata = `
    local pid = ARGV[1]
    local amont = ARGV[2]
    
    redis.call("HINCRBY", "invitingact_chargedata", pid, amont)

    local values = {
        pid = pid,
        charge_amont = amont,
        invite_num = 0
    }

    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_invitation_invite_charge_log",
            model = "insert",
            values = values
    }));


`

scripts.dp_set_invitingact_invitedata = `
    local pid = ARGV[1]
    
    redis.call("HINCRBY", "invitingact_invitedata", pid, 1)

    local values = {
        pid = pid,
        charge_amont = 0,
        invite_num = 1
    }

    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_invitation_invite_charge_log",
            model = "insert",
            values = values
    }));


`

scripts.dp_try_get_toy_invitingact = `
    local pid = ARGV[1]
    local toy_id = ARGV[2]
    local act_id = ARGV[3]

    local status = tonumber(redis.call("hget" , "invitingact_acttoy"..act_id.."status", pid)) or 0

    local inum = tonumber(redis.call("hget" , "invitingact_invitedata", pid)) or 0

    local cnum = tonumber(redis.call("hget" , "invitingact_chargedata", pid)) or 0


    local info = redis.call("hvals" , "cfg_invitingact")
    if not info then return -1 end

    local ret = -1
    for i=1, #info do
        local jinfo = cjson.decode(info[i])
        if jinfo.id == act_id and  jinfo.toy_id == toy_id then
            if status == 1 and cnum >= tonumber(jinfo.charge_num) and inum >= tonumber(jinfo.invite_num) then
                ret = redis.call("hget", "cfg_toy", jinfo.toy_id)
            else
                ret = -2
            end
        end
    end

    return ret
    
`

scripts.dp_change_toy_invitingact_status = `
    local pid = ARGV[1]
    local act_id = ARGV[2]

    redis.call("hset" , "invitingact_acttoy"..act_id.."status", pid, 2)  

    return 2
`

scripts.gy_get_reversalact_info =`
    local pid = ARGV[1]

    local cfg = redis.call("hvals", "cfg_reversalact")
    if not cfg then return -1 end

    local plate_profit = redis.call("hget", "reversalact_info", 'plate_profit')
    if not plate_profit then
        plate_profit = 10000
        redis.call("hset", "reversalact_info", 'plate_profit', plate_profit)
    end

    local info = {}
    local cost = 0

    for i=1, #cfg do
        local jcfg = cjson.decode(cfg[i])
        local tcfg =  {
            id = jcfg.id,
            name = jcfg.name,
            image_url = jcfg.image_url,
            type = jcfg.type
        }
        cost = jcfg.cost
        info[#info + 1] = tcfg
    end

    return cjson.encode({
        info = info,
        cost = cost
    })
`

scripts.dp_get_toy_reversalact =`
    local pid = ARGV[1]
    local water_type = ARGV[2]
    local total_play = tonumber(ARGV[3])
    local cost = tonumber(ARGV[4])
    local reversalact_id = tonumber(ARGV[5])
    local ts = tonumber(ARGV[6])

    local cfg = redis.call("hvals", "cfg_reversalact")
    if not cfg then return -1 end

    local reward = {}

    if total_play <= 2 then
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..reversalact_id.."_free", cost * 10)
    else
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..reversalact_id, cost * 10 * 0.9)    
    end

    if total_play <= 4 then
        water_type = "first_rate"
    end

    math.randomseed(ts)
    local gear_cfg = redis.call("hget", "cfg_reversalact_gear", reversalact_id)
    local jgear_cfg = cjson.decode(gear_cfg)
    local rate = math.random(1, 100)

    for i, v in ipairs(jgear_cfg) do
        if rate <= tonumber(v[water_type]) then
            reward.content = v.content
            reward.type = v.type
            reward.value = v.value
            reward.cost = v.cost
            reward.id = v.id
            reward.name = v.name
            reward.image_url = v.img_url
            break
        end
        rate = rate - tonumber(v[water_type])
    end

    if reward.type == "toy" then
        reward.toycfg = redis.call("hget", "cfg_toy", reward.content)
    end

    if total_play <= 2 then
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..reversalact_id.."_free", -reward.value)
    else
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..reversalact_id, -reward.value)
    end

    local gold_type = 1
    if total_play > 2 then
        gold_type = 2
    end


    local self_profit = redis.call("hget", "reversalact_info", pid)

    local newflag = 0
    if not self_profit then
        newflag = 1
        self_profit = 1
    end
    redis.call("hset", "reversalact_info", pid, self_profit)

    local values = {
        pid = pid,
        type = reward.type,
        content = reward.content,
        gold_type = gold_type,
        cost = reward.cost,
        value = reward.value,
        rate = water_type,
        newflag = newflag,
        gear = reversalact_id
    }

    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month",
        table = "t_get_reversalact_reward_log",
        model = "insert",
        values = values
    }))

    return cjson.encode(reward)

`

scripts.gy_get_rushhour_info = `
    local pid = ARGV[1]
    local rushhour_id = ARGV[2]
    local ts = tonumber(ARGV[3])

    local now_state = redis.call("hget", "rushhour", pid.."_"..rushhour_id)
    if not now_state then
        return 0
    end
    local jstate = cjson.decode(now_state)

    if ts > tonumber(jstate.end_time) then
        redis.call("hdel", "rushhour", pid.."_"..rushhour_id.."_gear")
        redis.call("hdel", "rushhour", pid.."_"..rushhour_id)
        return 0
    end
    
    return cjson.encode({remain_time = tonumber(jstate.end_time) - ts, redbag = jstate.total_redbag})
`

scripts.dp_get_pay_hoodle = `
    local plat_id = ARGV[1]

    local pays = {}
    local array_pay = cjson.decode(redis.call("get", "cfg_pay_client_hoodle"))
    for k ,v in pairs(array_pay) do
        local jpay = cjson.decode(v)
        if (jpay.in_plat == "" or string.find(jpay.in_plat, plat_id) ~= nil) 
            and (jpay.out_plat == "" or string.find(jpay.out_plat, plat_id) == nil) then
            pays[#pays + 1] = v
        end
    end

    return cjson.encode(pays)
`
scripts.gy_get_game_redbag_info = `
    local pid = ARGV[1]

    local redbag_arr = {}

    local redbag = redis.call("hvals", "cfg_game_redbag")
    if not redbag then return -1 end

    --每个红包都有相应的最大领取次数 到达最大限度后隐藏
    for k ,v in pairs(redbag) do
        local jredbag = cjson.decode(v)

        local record = tonumber(redis.call("hget", "game_redbag_record", pid.."_"..jredbag.id)) or 0

        local _redbag = {
                id = jredbag.id,
                name = jredbag.name,
                max_time = tonumber(jredbag.maxtime),
                amount = tonumber(jredbag.amount),
                now_time = record
            }

        if  tonumber(jredbag.maxtime) then
            if record < tonumber(jredbag.maxtime) then
                redbag_arr[#redbag_arr + 1] = _redbag
            end
        else
            redbag_arr[#redbag_arr + 1] = _redbag
        end
    end

    local vipflag = tonumber(redis.call("hget", "charge_hoodle_data", pid)) or 0
    if vipflag > 0 then
        vipflag = 1
    end

    return cjson.encode({
        redbag = redbag_arr,
        vip = vipflag
    })
`

scripts.gy_check_toy_game_redbag = `
    local pid = ARGV[1]
    local redbag_id = tonumber(ARGV[2])

    local redbag = redis.call("hvals", "cfg_game_redbag")
    if not redbag then return -1 end

    local vipflag = tonumber(redis.call("hget", "charge_hoodle_data", pid)) or 0

    for k ,v in pairs(redbag) do
        local jredbag = cjson.decode(v)

        if tonumber(jredbag.id) == redbag_id then
            local record = tonumber(redis.call("hget", "game_redbag_record", pid.."_"..jredbag.id)) or 0

            if vipflag == 0 then
                if redbag_id == 1 then 
                    if record > 0 then
                        return -2
                    end
                else 
                    return -3
                end
            else
                if  tonumber(jredbag.maxtime) then
                    if record >= tonumber(jredbag.maxtime) then
                        return -4
                    end
                end
            end
            return cjson.encode(jredbag)
        end
    end
`

scripts.dp_check_trinity_start = `
    local pid = ARGV[1]
    local trinity_id = ARGV[2]

    local now_state = redis.call("hget", "trinity", pid.."_"..trinity_id)
    if not now_state then
        local cfg = redis.call("hget", "cfg_trinity", trinity_id)
        if not cfg then return -1 end
        return cjson.encode({ cfg = cfg }) 
    end
    local jstate = cjson.decode(now_state)

    if jstate[3] == 0 then
        local cfg = redis.call("hget", "cfg_trinity", trinity_id)
        if not cfg then return -1 end

        local redbag = 0
        local time = 1
        for i = 1, 3 do
            if jstate[i] ~= 0 then
                redbag = redbag + jstate[i] * time
                time = time * 10
            end
        end
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..trinity_id, -redbag)
        redis.call("hdel", "trinity", pid.."_"..trinity_id.."_gear")
        redis.call("hdel", "trinity", pid.."_"..trinity_id)
        return cjson.encode({ cfg = cfg, redbag = redbag })  
    end
    return 0
`

scripts.db_check_littlegame_rate_by_waterline = `
    local pid = ARGV[1]
    local gear_id = ARGV[2]
    local water_line_cfg = tonumber(ARGV[3])
    local ts = ARGV[4]
    local reset_rate_time = tonumber(ARGV[5])
    local start_flag = tonumber(ARGV[6])
    local total_play = tonumber(ARGV[7])

    local rate_type = "normal_rate"

    local water_line = tonumber(redis.call("hget", "littlegame_water_line", "water_line_"..gear_id) or 0)
    local water_line_status = redis.call("hget", "littlegame_water_line", "water_line_"..gear_id.."status") or 0

    if water_line_status ~= 0 then
        if water_line_status == "out" then
            if water_line > 0 then 
                rate_type = "win_rate"
            elseif water_line < -water_line_cfg then
                redis.call("hset", "littlegame_water_line", "water_line_"..gear_id.."status", "in")
                rate_type = "lose_rate"
            else
                redis.call("hset", "littlegame_water_line", "water_line_"..gear_id.."status", "in")
                rate_type = "normal_rate"
            end
        else
            if water_line > water_line_cfg then 
                rate_type = "win_rate"
                redis.call("hset", "littlegame_water_line", "water_line_"..gear_id.."status", "out")
            elseif water_line < -water_line_cfg then
                rate_type = "lose_rate"
            else
                rate_type = "normal_rate"
            end
        end
    else
        if water_line > water_line_cfg then 
            redis.call("hset", "littlegame_water_line", "water_line_"..gear_id.."status", "out")
        elseif water_line <= 0 then 
            redis.call("hset", "littlegame_water_line", "water_line_"..gear_id.."status", "in")
        end
    end

    
    local rate_name = ""

    local oldts = redis.call("hget", "littlegame_water_line", "time")

    if oldts and ts - oldts >= 600 then
        local water_line_free_1 = redis.call("hget", "littlegame_water_line", "water_line_free_1")
        local water_line_free_2 = redis.call("hget", "littlegame_water_line", "water_line_free_2")
        local water_line_free_3 = redis.call("hget", "littlegame_water_line", "water_line_free_3")
        local water_line_1 = redis.call("hget", "littlegame_water_line", "water_line_1")
        local water_line_2 = redis.call("hget", "littlegame_water_line", "water_line_2")
        local water_line_3 = redis.call("hget", "littlegame_water_line", "water_line_3")

        local values = {
            ts = ts,
            water_line_free_1 = water_line_free_1,
            water_line_free_2 = water_line_free_2,
            water_line_free_3 = water_line_free_3,
            water_line_1 = water_line_1,
            water_line_2 = water_line_2,
            water_line_3 = water_line_3
        }

        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_littlegame_water_line_log",
            model = "insert",
            values = values
        }))

        redis.call("hset", "littlegame_water_line", "time", ts)
    end

    if total_play <= 3 then
        return cjson.encode({rate_name= "first_rate", rate_type= "normal_rate"})
    end

    

    local rate_gear = redis.call("hget", "littlegame_water_line", pid.."_"..gear_id.."_rate_gear")

    if not rate_gear then 
        local rate_cfg = redis.call("hget", "cfg_littlegame_rate_gear", rate_type)
        if not rate_cfg then return -1 end

        math.randomseed(ts)
        local rate = math.random(1,100)

        local jrate = cjson.decode(rate_cfg)

        for i, v in pairs(jrate) do
            if rate <= tonumber(v) then
                rate_name = i
                redis.call("hset", "littlegame_water_line", pid.."_"..gear_id.."_rate_gear", cjson.encode({rate_name= rate_name,play_time=1}))
                break
            end
            rate = rate - tonumber(v)
        end
        return cjson.encode({rate_name= rate_name, rate_type= rate_type})
    end

    local jrate_gear = cjson.decode(rate_gear)

    if start_flag == 0 then
        return cjson.encode({rate_name= jrate_gear.rate_name, rate_type= rate_type})
    elseif reset_rate_time > tonumber(jrate_gear.play_time) then
        jrate_gear.play_time = jrate_gear.play_time + 1
        redis.call("hset", "littlegame_water_line", pid.."_"..gear_id.."_rate_gear", cjson.encode({rate_name =  jrate_gear.rate_name, play_time = jrate_gear.play_time}))
        return cjson.encode({rate_name= jrate_gear.rate_name, rate_type= rate_type})
    else

        local rate_cfg = redis.call("hget", "cfg_littlegame_rate_gear", rate_type)
        if not rate_cfg then return rate_cfg end

        local jrate_cfg = cjson.decode(rate_cfg)
        math.randomseed(ts)
        local rate = math.random(1,100)

        for i, v in pairs(jrate_cfg) do
            if rate <= tonumber(v) then
                rate_name = i
                redis.call("hset", "littlegame_water_line", pid.."_"..gear_id.."_rate_gear", cjson.encode({rate_name= rate_name,play_time=1}))
                break
            end
            rate = rate - tonumber(v)
        end
        return cjson.encode({rate_name= rate_name, rate_type= rate_type})
    end
`

scripts.dp_trinity_start = `
    local pid = ARGV[1]
    local trinity_id = ARGV[2]
    local ts = tonumber(ARGV[3])
    local gear = ARGV[4]
    local water_type = ARGV[5]
    local cost = tonumber(ARGV[6])
    local hoodle = tonumber(ARGV[7])
    local total_play = tonumber(ARGV[8])

    local now_state = redis.call("hget", "trinity", pid.."_"..trinity_id)
    if not now_state then
        now_state = "[-1,-1,-1]"
        redis.call("hset", "trinity", pid.."_"..trinity_id, now_state)

        math.randomseed(ts)
        local gear_cfg = redis.call("hget", "cfg_trinity_gear", gear)
        local jgear_cfg = cjson.decode(gear_cfg)
        local rate = math.random(1, 100)

        if total_play <= 2 then
            redis.call("HINCRBY", "littlegame_water_line", "water_line_"..trinity_id.."_free", cost * 10 )
        else
            redis.call("HINCRBY", "littlegame_water_line", "water_line_"..trinity_id, cost * 10 * 0.9)    
        end

        if total_play <= 4 then
            water_type = "first_rate"
        end


        for i, v in ipairs(jgear_cfg) do
            if rate <= tonumber(v[water_type]) then
                redis.call("hset", "trinity", pid.."_"..trinity_id.."_gear", cjson.encode({v.one, v.two, v.three, ts}))
                break
            end
            rate = rate - tonumber(v[water_type])
        end
        
    end
    local jgear = cjson.decode(redis.call("hget", "trinity", pid.."_"..trinity_id.."_gear"))

    local jstate = cjson.decode(now_state)
    local idx = 0
    for i = 1, 3 do
        if jstate[i] == -1 then idx = i break end
    end

    jstate[idx] = 0
    redis.call("hset", "trinity", pid.."_"..trinity_id, cjson.encode(jstate))

    local jgear_idx = 0
    for i = 1, 3 do
        if jstate[i] == 0 then jgear_idx = i break end
    end
    
    local playId = "trinity_"..pid.."_"..trinity_id.."_"..ts 

    redis.call("hset", "trinity_catch_map", playId, cjson.encode({ pid = pid, tid = trinity_id, idx = idx, gear = jgear[jgear_idx], start_time = jgear[4], total_play = total_play,cost = cost, water_type = water_type}));


    local values = {}
    values.pid = pid

    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        table = "t_first_play_trinity_login",
        model = "insert_or_ignore",
        values = values
    }))

    local ret = jgear[jgear_idx] ~= "0" and 1 or 0
    return cjson.encode({ ret_code = 0, playId = playId, force = 800, ret = ret, hoodle = hoodle })
`


scripts.dp_trinity_end = `

    local split = function(input, delimiter)
        input = tostring(input)
        delimiter = tostring(delimiter)
        if (delimiter=='') then return false end
        local pos,arr = 0, {}
        for st,sp in function() return string.find(input, delimiter, pos, true) end do
            table.insert(arr, string.sub(input, pos, st - 1))
            pos = sp + 1
        end
        table.insert(arr, string.sub(input, pos))
        return arr
    end

    local pid = ARGV[1]
    local playId = ARGV[2]
    local succ = tonumber(ARGV[3])
    local ts = tonumber(ARGV[4])

    local play = redis.call("hget", "trinity_catch_map", playId)
    if not play then return -1 end
    redis.call("hdel", "trinity_catch_map", playId)

    local jplay = cjson.decode(play)
    local now_state = redis.call("hget", "trinity", pid.."_"..jplay.tid)
    if not now_state then return -2 end
    local jstate = cjson.decode(now_state)
    local idx = jplay.idx
    if tonumber(jplay.gear) == 0 then
        jstate[idx] = 0
    elseif succ == 1 then
        math.randomseed(ts)
        local gear = split(jplay.gear, "-")
        local num = math.random(tonumber(gear[1]), tonumber(gear[2]))
        jstate[idx] = num
    end


    local redbag = nil

    if idx == 3 then
        redbag = 0
        local time = 1
        for i = 1, 3 do
            if jstate[i] ~= 0 then
                redbag = redbag + jstate[i] * time
                time = time * 10
            end
        end
        redis.call("hdel", "trinity", pid.."_"..jplay.tid.."_gear")
        redis.call("hdel", "trinity", pid.."_"..jplay.tid)
        if jplay.total_play and jplay.total_play <= 2 then
            redis.call("HINCRBY", "littlegame_water_line", "water_line_"..jplay.tid.."_free", -redbag)
        else
            redis.call("HINCRBY", "littlegame_water_line", "water_line_"..jplay.tid, -redbag)
        end
    else
        redis.call("hset", "trinity", pid.."_"..jplay.tid, cjson.encode(jstate))
    end

    local values = {
        pid = pid,
        srv_result = jplay.gear,
        client_result = succ,
        num_result = jstate[idx],
        start_time = jplay.start_time,
        room_id = jplay.tid,
        nowtime_redbag = redbag,
        total_play = jplay.total_play,
        fcost = jplay.cost,
        rate = jplay.water_type
    }

    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month",
        table = "t_trinity_catch_log",
        model = "insert",
        values = values
    }))

    return cjson.encode({ ret_code = 0, num = jstate[idx], redbag = redbag, idx = idx })
`

scripts.dp_check_rushhour_start = `
    local pid = ARGV[1]
    local rushhour_id = ARGV[2]
    local now_time = tonumber(ARGV[3])

    local cfg = redis.call("hget", "cfg_rushhour", rushhour_id)
    if not cfg then return -1 end

    local now_state = redis.call("hget", "rushhour", pid.."_"..rushhour_id)
    if not now_state then
        return cjson.encode({ cfg = cfg }) 
    end

    local jstate = cjson.decode(now_state)

    local jgear = cjson.decode(redis.call("hget", "rushhour", pid.."_"..rushhour_id.."_gear"))

    if now_time > tonumber(jstate.end_time) then
        redis.call("hdel", "rushhour", pid.."_"..rushhour_id.."_gear")
        redis.call("hdel", "rushhour", pid.."_"..rushhour_id)
        return cjson.encode({ cfg = cfg }) 
    end

    return 0

`

scripts.dp_rushhour_start = `
    local pid = ARGV[1]
    local rushhour_id = ARGV[2]
    local ts = tonumber(ARGV[3])
    local gear = ARGV[4]
    local water_type = ARGV[5]
    local cost = tonumber(ARGV[6])
    local total_time = tonumber(ARGV[7])
    local catch_time = tonumber(ARGV[8])
    local hoodle = tonumber(ARGV[9])
    local total_play = tonumber(ARGV[10])

    local split = function(input, delimiter)
        input = tostring(input)
        delimiter = tostring(delimiter)
        if (delimiter=='') then return false end
        local pos,arr = 0, {}
        for st,sp in function() return string.find(input, delimiter, pos, true) end do
            table.insert(arr, string.sub(input, pos, st - 1))
            pos = sp + 1
        end
        table.insert(arr, string.sub(input, pos))
        return arr
    end

    local now_state = redis.call("hget", "rushhour", pid.."_"..rushhour_id)
    if not now_state then
        now_state = {
            end_time = 0,
            total_redbag = 0,
            rest_redbag = 0,
            weak_time = 0,
            total_catch_time = 0,
            catch_time = 0
        }
        
        math.randomseed(ts)
        local gear_cfg = redis.call("hget", "cfg_rushhour_gear", gear)
        local jgear_cfg = cjson.decode(gear_cfg)
        local rate = math.random(1, 100)
        
        if total_play <= 2 then
            redis.call("HINCRBY", "littlegame_water_line", "water_line_"..rushhour_id.."_free", cost * 10)
        else
            redis.call("HINCRBY", "littlegame_water_line", "water_line_"..rushhour_id, cost * 10 *0.9)
        end

        if total_play <= 4 then
            water_type = "first_rate"
        end

        for i, v in ipairs(jgear_cfg) do
            if rate <= tonumber(v[water_type]) then
                local redbagrange = split(v["redbag"], "-")
                local totalredbag = math.random(redbagrange[1],redbagrange[2])
                redis.call("hset", "rushhour", pid.."_"..rushhour_id.."_gear", totalredbag)
                now_state.weak_time = tonumber(v["weak_time"])
                now_state.end_time = ts + total_time 
                now_state.total_catch_time = catch_time
                now_state.catch_time = 0
                break
            end
            rate = rate - tonumber(v[water_type])
        end
        redis.call("hset", "rushhour", pid.."_"..rushhour_id, cjson.encode(now_state))
    end

    local jstate = cjson.decode(redis.call("hget", "rushhour", pid.."_"..rushhour_id))
    local playId = "rushhour_"..pid.."_"..rushhour_id.."_"..ts 

    math.randomseed(ts)

    local ret = 0
    if tonumber(jstate.total_catch_time) > 0 then
        ret = math.random(1, tonumber(jstate.total_catch_time) + 1)
        if ret <=  tonumber(jstate.weak_time) then
            ret = 0
            jstate.weak_time = jstate.weak_time - 1
        else
            ret = 1
        end
    else
        ret = 0
    end

    local catch_ret = 1

    if tonumber(jstate.total_catch_time) <= -2 then 
        catch_ret = 0
    end
    
    local values = {}
    values.pid = pid

    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        table = "t_first_play_rushhour_login",
        model = "insert_or_ignore",
        values = values
    }))

    jstate.total_catch_time = jstate.total_catch_time - 1 
    jstate.catch_time = jstate.catch_time + 1
    redis.call("hset", "rushhour_catch_map", playId, cjson.encode({ pid = pid, rid = rushhour_id, idx = jstate.catch_time, gear = ret, total_play = total_play, cost = cost, catch_ret = catch_ret, water_type = water_type}));
    redis.call("hset", "rushhour", pid.."_"..rushhour_id, cjson.encode(jstate))

    return cjson.encode({ ret_code = 0, playId = playId, force = 800, ret = catch_ret, remain_time = jstate.end_time - ts, hoodle = hoodle })

`

scripts.dp_rushhour_end = `
    local pid = ARGV[1]
    local playId = ARGV[2]
    local succ = tonumber(ARGV[3])
    local ts = tonumber(ARGV[4])

    local play = redis.call("hget", "rushhour_catch_map", playId)
    if not play then return -1 end
    local jplay = cjson.decode(play)

    local now_state = redis.call("hget", "rushhour", pid.."_"..jplay.rid)
    if not now_state then return -2 end

    local jstate = cjson.decode(now_state)


    local jgear = cjson.decode(redis.call("hget", "rushhour", pid.."_"..jplay.rid.."_gear"))

    if ts  > tonumber(jstate.end_time) then
        redis.call("hdel", "rushhour", pid.."_"..jplay.rid.."_gear")
        redis.call("hdel", "rushhour", pid.."_"..jplay.rid)
        return -2
    end

    redis.call("hdel", "rushhour_catch_map", playId)

    local nowtime_redbag = 0
    local idx = jplay.idx

    math.randomseed(ts)
    if succ == 1 then
        if tonumber(jplay.gear) == 1 then
            if tonumber(jstate.total_catch_time) > 0 then
                nowtime_redbag = math.random(1, (tonumber(jgear)/(jstate.total_catch_time + jstate.catch_time) ) )
            elseif tonumber(jstate.total_catch_time) == 0 then
                nowtime_redbag = tonumber(jgear) - tonumber(jstate.total_redbag)
            else
                nowtime_redbag = math.random(1,5)
            end 
        else
            if tonumber(jstate.total_catch_time) >= -2 then
                nowtime_redbag = math.random(1,5)
            else
                nowtime_redbag = 0
            end
        end
    else
        nowtime_redbag = 0
    end

    jstate.total_redbag = tonumber(jstate.total_redbag) + nowtime_redbag

    if jplay.total_play and jplay.total_play <= 2 then
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..jplay.rid.."_free", -nowtime_redbag)
    else
        redis.call("HINCRBY", "littlegame_water_line", "water_line_"..jplay.rid, -nowtime_redbag)
    end

    redis.call("hset", "rushhour", pid.."_"..jplay.rid, cjson.encode(jstate))

    local values = {
        pid = pid,
        srv_result = jplay.gear,
        client_result = succ,
        nowtime_redbag = nowtime_redbag,
        end_time = jstate.end_time,
        room_id = jplay.rid,
        total_play = jplay.total_play,
        fcost = jplay.cost,
        rate = jplay.water_type
    }
    
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month",
        table = "t_rushhour_catch_log",
        model = "insert",
        values = values
    }))

    return cjson.encode({ 
        nowtime_redbag = nowtime_redbag, 
        idx = idx, 
        totalredbag = tonumber(jgear), 
        player_redbag = jstate.total_redbag, 
        gear = jgear
    })
`
scripts.dp_update_vr_rooms = `
    local isExist = function(arr,target)
        local Exist = false
        for k,v in ipairs(arr) do
            if v == target then
                Exist = true
            end
        end
        return Exist
    end

    local pid = ARGV[1]
    local toy_id = ARGV[2]
    local rid = ARGV[3]
    local dollposarr = ARGV[4]
    local clawpos = ARGV[5]
    local clawRootpos = ARGV[6]

    local vr_room = redis.call("hvals", "multi_vr_room_"..toy_id.."_"..rid)
    if not vr_room then
        return -1
    end

    redis.call("hset", "multi_vr_room_"..toy_id.."_"..rid, "dollposarr",dollposarr)
    redis.call("hset", "multi_vr_room_"..toy_id.."_"..rid, "clawpos", clawpos)
    redis.call("hset", "multi_vr_room_"..toy_id.."_"..rid, "clawRootpos", clawRootpos)

    local players = redis.call("hget", "multi_vr_room_"..toy_id.."_"..rid, "players")

    local pidarr = {}
    if players then
        pidarr = cjson.decode(players)
    end

    if not isExist(pidarr,pid) then
        pidarr[#pidarr + 1] = pid
    end
    
    redis.call("hset", "multi_vr_room_"..toy_id.."_"..rid, "players", cjson.encode(pidarr))

    return cjson.encode({ 
        players = pidarr, 
        dollposarr = dollposarr, 
        clawpos = clawpos,
        clawRootpos = clawRootpos
    })

`

scripts.dp_update_vr_rooms_catch = `
    local isExist = function(arr,target)
        local Exist = false
        for k,v in ipairs(arr) do
            if v == target then
                Exist = true
            end
        end
        return Exist
    end

    local pid = ARGV[1]
    local toy_id = ARGV[2]
    local rid = ARGV[3]
    local clawRootpos = ARGV[4]
    local posdown = ARGV[5]
    local target = ARGV[6]

    return 0
`

scripts.gy_get_3d_multi_room_cfg = `
    local toy_id = ARGV[1]
    local room_id = ARGV[2]

    local roomarr = redis.call("hvals", "cfg_rooms_3d_multi")
    if not roomarr then return -1 end

    local cfg = nil

    for i, roominfo in ipairs(roomarr) do
        local room = cjson.decode(roominfo)
        if room.toy_id == toy_id and room.room_id == room_id then
            cfg = roominfo
        end
    end

    return cfg
`

scripts.gy_get_3d_multi_room_info = `
    local isExist = function(arr,target)
        local Exist = false
        local pos = -1
        for k,v in ipairs(arr) do
            if v == target then
                Exist = true
                pos = k
            end
        end
        return Exist,pos
    end

    local pid = ARGV[1]
    local toy_id = ARGV[2]
    local room_id = ARGV[3]
    local id = ARGV[4]

    local oldroom = tonumber(redis.call("hget", "player_multi_room_map", pid)) or 0

    if oldroom ~= 0 then
        local oldroomcfg = redis.call("hget", "cfg_rooms_3d_multi", oldroom)
        if not oldroomcfg then return -1 end
            
        local oldcfg = cjson.decode(oldroomcfg)
        local key = "multi_vr_room_"..oldcfg.toy_id.."_"..oldcfg.room_id
        local room_player_arr = redis.call("hget", "multi_room_player_map", key)

        local pidarr = {}
        if room_player_arr then
            pidarr = cjson.decode(room_player_arr)
        end

        local exist, pos = isExist(pidarr,pid)

        if exist and pos > 0 then
            table.remove(pidarr,pos)
        end

        redis.call("hset", "multi_room_player_map", key, cjson.encode(pidarr))
    end

    redis.call("hset", "player_multi_room_map", pid, id)
    local newkey = "multi_vr_room_"..toy_id.."_"..room_id
    local new_room_player_arr = redis.call("hget", "multi_room_player_map", newkey)

    local newpidarr = {}

    if new_room_player_arr then
        newpidarr = cjson.decode(new_room_player_arr)
    end

    local exist, pos = isExist(newpidarr,pid)
    if not exist and pos == -1 then
        newpidarr[#newpidarr + 1] = pid
    end    
    redis.call("hset", "multi_room_player_map", newkey, cjson.encode(newpidarr))

    local dollposarr = {}
    local clawpos = {}

    dollposarr = redis.call("hget", newkey, "dollposarr") or {}
    clawpos = redis.call("hget", newkey, "clawpos") or {}
    local pidarr = redis.call("hget", "multi_room_player_map", newkey)

    return cjson.encode({ 
        players = pidarr, 
        dollposarr = dollposarr, 
        clawpos = clawpos
    })

`
scripts.join_ddz_room = `
    local split = function(input, delimiter)
        input = tostring(input)
        delimiter = tostring(delimiter)
        if (delimiter=='') then return false end
        local pos,arr = 0, {}
        for st,sp in function() return string.find(input, delimiter, pos, true) end do
            table.insert(arr, string.sub(input, pos, st - 1))
            pos = sp + 1
        end
        table.insert(arr, string.sub(input, pos))
        return arr
    end

    local pid = ARGV[1]
    local room_id = ARGV[2]
    local hoodle = tonumber(ARGV[3])
    local enter_time = ARGV[4]

    local room_cfg = redis.call("hget", "cfg_room_ddz", room_id)
    if not room_cfg then return -1 end

    local jcfg = cjson.decode(room_cfg)
    local limit = split(jcfg.hoodle_range, "-")
    
    if tonumber(limit[2]) >0 then
        if hoodle < tonumber(limit[1]) or hoodle > tonumber(limit[2]) then
            return -2 
        end
    else
        if hoodle < tonumber(limit[1]) then
            return -2 
        end
    end

    local values = {
        pid = pid,
        room_id = room_id,
        hoodle = hoodle,
        enter_time = enter_time,
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({ 
        suffix = "month",
        table = "t_enter_ddz_room_log",
        model = "insert",
        values = values
    }))

    return 0

`

scripts.get_game_room_cfg = `
    local split = function(input, delimiter)
        input = tostring(input)
        delimiter = tostring(delimiter)
        if (delimiter=='') then return false end
        local pos,arr = 0, {}
        for st,sp in function() return string.find(input, delimiter, pos, true) end do
            table.insert(arr, string.sub(input, pos, st - 1))
            pos = sp + 1
        end
        table.insert(arr, string.sub(input, pos))
        return arr
    end

    local game_type = ARGV[1]
    local hour = tonumber(ARGV[2])
    local minutes = tonumber(ARGV[3])
    local ts = tonumber(ARGV[4])
    local pid = ARGV[5]
    local hoodle = ARGV[6]

    local cfg

    if game_type == "ddz" then
        cfg = redis.call("hget", "cfg_game_room_client", game_type)
        local jcfg = cjson.decode(cfg)
        for k,v in pairs(jcfg) do
            if tonumber(k) ~= 0 then
                local key = "ddz_people_"..k.."_"..hour.."_"..minutes
                local people = redis.call("hget", "cfg_random_people_ddz", key)
                local room_range = redis.call("hget", "cfg_random_people_ddz", hour)
                room_range = cjson.decode(room_range)
                local limit
                if not people then
                    limit = split(room_range["room_"..k], "-")
                    math.randomseed(ts)
                    people = math.random(tonumber(limit[1]), tonumber(limit[2]))
                    redis.call("hset", "cfg_random_people_ddz", key, people)
                    
                end
                jcfg[k][1].number = people
            end
        end
        cfg = cjson.encode(jcfg)

        local values = {
            pid = pid,
            cnt = 1,
            hoodle = hoodle
        }
        local modifys = {}
        modifys[#modifys + 1] = "hoodle"
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_enter_ddz_log",
            model = "add_date_cnt",
            values = values,
            modifys = modifys
        }))
    else
        cfg = redis.call("hget", "cfg_game_room_client", game_type)
    end
    return cfg
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
        client.hset("dp_gamecom_sha", key, ret)
        client.hset("dp_gamecom_src", key, scripts[key])
    });
}

function loadAllScripts(){
    let cfg = g_configs.redis_configs["game_com"]
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
