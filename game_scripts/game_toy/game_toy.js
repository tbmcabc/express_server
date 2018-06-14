require("../config")
const redis = require('redis')

let scripts = {}

scripts.gy_load_toy_rooms_state = `
    local jdatas = cjson.decode(ARGV[1])
    if jdatas.data == nil then return "{}" end

    for i = 1, #jdatas.data do
        local rdata = jdatas.data[i]
        local member_key = "game_toy_"..rdata.rid.."_member"
        rdata.member = redis.call("scard", member_key)
    end
    return cjson.encode(jdatas)
`

scripts.gy_start_toy_queue = `
    local pid = ARGV[1]
    local rid = ARGV[2]
    local playId = ARGV[3]

    redis.call("hset", "player_toy_map", pid, playId)

    local now_cnt = tonumber(redis.call("hget", "game_toy_continue_catch", rid)) or 0
    --if now_cnt >= 3 then
    --    return "机器正在维护，请稍候再试"
    --else
        return 0
    --end
`

scripts.gy_exit_toy_queue=`
    local pid = ARGV[1]
    local rid = redis.call("hget", "game_toy_room_map", pid)
    if not rid then return -1 end
    local rkey = "game_toy_"..rid.."_queue"
    redis.call("srem", rkey, pid);
    return 0
`

scripts.gy_start_toy_game = `
    local pid = ARGV[1]
    local rid = ARGV[2]
    local toy_id = ARGV[3]
    local cfg = ARGV[4]
    local nick_name = ARGV[5]
    local head_img = ARGV[6]
    local cost = ARGV[7]
    local time = ARGV[8]
    local catch_type = ARGV[9]
    local record_id = ARGV[10]
    local playId = redis.call("hget", "player_toy_map", pid)
    if not playId then return -1 end

    local values = {
        pid = pid,
        toy_id = toy_id,
        rid = rid,
        catch_time = time,
        cost = cost,
        catch_type = catch_type,
        record_id = record_id
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_catch_toy_log",
            model = "insert",
            values = values
    }));

    local rkey = "game_toy_"..rid.."_queue"
    redis.call("sadd", rkey, pid)
    redis.call("EXPIRE", rkey, 40)
    
    redis.call("hset", "real_play_toy_map", playId, cjson.encode({ pid = pid, rid = rid, toy_id = toy_id, cfg = cfg, nick_name = nick_name, head_img = head_img, ct = catch_type}));
    return 0
`

scripts.gy_start_game_3d = `
    local pid = ARGV[1]
    local rid = ARGV[2]
    local token = ARGV[3]
    local force = ARGV[4]
    local result = ARGV[5]
    local ts = ARGV[6]
    local cfg = ARGV[7]
    local nick_name = ARGV[8]
    local cost = ARGV[9]
    local way = ARGV[10]
    local time = ARGV[11]
    local head_img = ARGV[12]
    local catch_type = ARGV[13]

    redis.call("hset", "v3d_play_toy_map", token, cjson.encode({ pid = pid, rid = rid, force = force, 
        result = result, ts = ts, cfg = cfg, nick_name = nick_name, head_img = head_img, ct = catch_type }));

    if way ~= "" then
        local values = {
            pid = pid,
            toy_id = rid,
            catch_time = time,
            catch_type = catch_type,
            cost = cost,
            way = way,
            token = token,
            svr_result = result,
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({
                suffix = "month",
                table = "t_catch_toy_vr_log",
                model = "insert",
                values = values
        }));
    end
    return 0
`

// --记录这个玩家的抓取记录
// --local self_toy_catch_log_key = "self_toys_"..pid.."_catch_log"
// --redis.call("lpush", self_toy_catch_log_key, get_data)
// --抓取记录
// --local catch_info = cjson.encode({ nick_name = jdata.nick_name, head_img = jdata.head_img, time = long_time })
// --local toy_catch_log_key = "toy_"..jdata.rid.."_catch_log"
// --redis.call("lpush",toy_catch_log_key, catch_info)
// --redis.call("ltrim", toy_catch_log_key, 0, 9)
// --抓娃娃达人数据
// --redis.call("hset", "catch_player_map", pid, catch_info)
// --local toy_catch_rank_key = "toy_"..jdata.rid.."_rank"
// --redis.call("zincrby", toy_catch_rank_key, 1, pid)

scripts.gy_end_game_3d = `
    local pid = ARGV[1]
    local token = ARGV[2]
    local succ = ARGV[3]
    local ts = ARGV[4]
    local way = ARGV[5]
    local long_time = ARGV[6]

    local data = redis.call("hget", "v3d_play_toy_map", token)
    if not data then return -1 end

    local jdata = cjson.decode(data)
    if jdata.pid ~= pid then return -2 end

    redis.call("hdel", "v3d_play_toy_map", token)

    if tonumber(jdata.result) == 0 then return -3 end
    --if jdata.result == 0 then return -3 end

    if tonumber(succ) == 1 then
        local jcfg = cjson.decode(jdata.cfg)
        if jcfg.auto_type == nil or jcfg.auto_type == "" then
            --通知gameToy服务器，把获得娃娃的数据爬入mysql
            local get_data = cjson.encode({ pid = pid, nick_name = jdata.nick_name, toy_id = jdata.rid, cfg = jdata.cfg, time = long_time, expire = 1, playId = token, way = "c2s_v3d_end"})
            
            local self_toys_map_key = "self_toys_"..pid.."_toys_map"
            redis.call("hset", self_toys_map_key, token, jdata.rid)

            --redis里面的我的娃娃数据
            local self_toys_key  = "self_toys_"..pid.."_get"
            redis.call("hset", self_toys_key, token, get_data)

            --放入超时队列15天没有处理的娃娃，自动转换成积分
            redis.call("lpush", "expire_toy_list", cjson.encode({ pid = pid, ts = ts, playId = token, cfg = jdata.cfg}))
        end
        --玩家抓到娃娃，记录水线逻辑
        redis.call("lpush", "modify_profits_cmd_list", cjson.encode({ type = "catch_toy", cfg = jdata.cfg}))
        redis.call("publish", "modify_profits_notify", "")

        local values = {
            pid = pid,
            toy_id = jdata.rid,
            catch_time = long_time,
            playId = token,
            way = way,
            catch_type = jdata.ct
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({
                suffix = "month",
                table = "t_catch_succ_vr_log",
                model = "insert",
                values = values
        }));
        return jdata.cfg
    end
    
    return 0
`

scripts.gy_enter_toy_room = `
    local pid = ARGV[1]
    local rid = ARGV[2]
    local toy_id = ARGV[3]
    local time = ARGV[4]

    local old_rid = redis.call("hget", "game_toy_room_map", pid)
    if old_rid then
        redis.call("srem", "game_toy_"..old_rid.."_member", pid)    
        redis.call("srem", "game_toy_"..old_rid.."_queue", pid)    
    end

    if toy_id == "" then
        toy_id = redis.call("hget", "rid_to_tid_map", rid) or ""
    else
        redis.call("hset", "rid_to_tid_map", rid, toy_id)
    end
    
    local set_key = "game_toy_"..rid.."_member"
    local rkey = "game_toy_"..rid.."_queue"
    local cmt_key = "game_toy_"..rid.."_cmts"
    local catch_log_key = "game_toy_"..rid.."_catch_log"
    redis.call("sadd", set_key, pid)
    redis.call("hset", "game_toy_room_map", pid, rid)
    local cmts = redis.call("LRANGE", cmt_key, -5, -1)
    local logs = redis.call("LRANGE", catch_log_key, 0, -1)
    --玩家进入房间记录
    if toy_id ~= "" then
        local values = {
            pid = pid,
            toy_id = toy_id,
            rid = rid,
            enter_time = time
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({ 
            suffix = "month",
            table = "t_enter_room_log",
            model = "insert",
            values = values
        }))
    end
    return cjson.encode({ total_cnt = redis.call("scard", set_key), queue_cnt = redis.call("scard", rkey), cmts = cmts, logs = logs })
`

scripts.gy_exit_toy_room = `
    local pid = ARGV[1]
    local rid = ARGV[2]

    local rkey = "game_toy_"..rid.."_queue"
    local set_key = "game_toy_"..rid.."_member"
    redis.call("srem", rkey, pid);
    redis.call("srem", set_key, pid)
    redis.call("hdel", "game_toy_room_map", pid)
    return cjson.encode({ total_cnt = redis.call("scard", set_key), queue_cnt = redis.call("scard", rkey) })   
`

scripts.gy_player_offline = `
    local pid = ARGV[1]

    local rid = redis.call("hget", "game_toy_room_map", pid)
    if not rid then return end

    local rkey = "game_toy_"..rid.."_queue"
    local set_key = "game_toy_"..rid.."_member"
    redis.call("srem", rkey, pid);
    redis.call("srem", set_key, pid)
    redis.call("hdel", "game_toy_room_map", pid)
`

scripts.gy_submit_comment = `
    local rid = ARGV[1]
    local cmt = ARGV[2]
    local rkey = "game_toy_"..rid.."_cmts"
    redis.call("RPUSH", rkey, cmt)
    redis.call("LTRIM", rkey, -5, -1)
`

// --记录这个玩家的抓取记录
// --local self_toy_catch_log_key = "self_toys_"..jplay.pid.."_catch_log"
// --redis.call("lpush", self_toy_catch_log_key, get_data)
// --添加这个娃娃的抓取记录（保留最近的10条）
// --local catch_info = cjson.encode({ nick_name = jplay.nick_name, head_img = jplay.head_img, time = time })
// --local toy_catch_log_key = "toy_"..jplay.toy_id.."_catch_log"
// --redis.call("lpush",toy_catch_log_key, catch_info)
// --redis.call("ltrim", toy_catch_log_key, 0, 9)
// --抓娃娃达人数据（排行榜）
// --redis.call("hset", "catch_player_map", jplay.pid, catch_info)
// --local toy_catch_rank_key = "toy_"..jplay.toy_id.."_rank"
// --redis.call("zincrby", toy_catch_rank_key, 1, pid)

scripts.gy_get_catch_result = `
    local playId = ARGV[1]
    local succ = ARGV[2]
    local time = ARGV[3]
    local ts = ARGV[4]

    local play = redis.call("hget", "real_play_toy_map", playId)
    if not play then return end

    redis.call("hdel", "real_play_toy_map", playId)

    local jplay = cjson.decode(play)
    if succ == "1" then
        redis.call("HINCRBY", "game_toy_continue_catch", jplay.rid, 1)

        local jcfg = cjson.decode(jplay.cfg)
        if jcfg.auto_type == nil or jcfg.auto_type == "" then
            local get_data = cjson.encode({ pid = jplay.pid,  nick_name = jplay.nick_name, toy_id = jplay.toy_id, cfg = jplay.cfg, time = time, expire = 1, playId = playId, way = "c2s_catch_success"})
            --redis里面的我的娃娃数据
            local self_toys_key  = "self_toys_"..jplay.pid.."_get"
            redis.call("hset", self_toys_key, playId, get_data)

            local self_toys_map_key = "self_toys_"..jplay.pid.."_toys_map"
            redis.call("hset", self_toys_map_key, playId, jplay.toy_id)

            --放入超时队列15天没有处理的娃娃，自动转换成积分
            redis.call("lpush", "expire_toy_list", cjson.encode({ pid = jplay.pid, ts = ts, playId = playId, cfg = jplay.cfg}))
        end

        --玩家抓到娃娃，记录水线逻辑
        redis.call("lpush", "modify_profits_cmd_list", cjson.encode({ type = "catch_toy", cfg = jplay.cfg}))
        redis.call("publish", "modify_profits_notify", "")

        local values = {
            pid = jplay.pid,
            toy_id = jplay.toy_id,
            rid = jplay.rid,
            catch_time = time,
            playId = playId,
            catch_type = jplay.ct,
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({
                suffix = "month",
                table = "t_catch_succ_log",
                model = "insert",
                values = values
        }));
    else
        redis.call("hdel", "game_toy_continue_catch", jplay.rid)
    end

    local queue_key = "game_toy_"..jplay.rid.."_queue"
    redis.call("srem", queue_key, jplay.pid)

    return play
`

scripts.gy_exchange_goods = `
    local pid = ARGV[1]
    local goods_id = ARGV[2]
    local cfg = ARGV[3]
    local score = ARGV[4]
    local nowScore = ARGV[5]
    local time = ARGV[6]
    local playId = ARGV[7]
    local ext = ARGV[8]

    --记录玩家兑换商品的记录
    local goodslog_key = "exchange_goods_log_"..pid
    redis.call("lpush", goodslog_key, cjson.encode({ gid = goods_id, cfg = cfg, time = time, ext = ext}))

    local values = {
        pid = pid,
        mall_id = goods_id,
        score = score,
        now_score = nowScore,
        exchange_time = time,
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_exchange_log",
            model = "insert",
            values = values
    }));
`

scripts.gy_goods_exchange_score = `
    local pid = ARGV[1]
    local playId = ARGV[2]
    local time = ARGV[3]
    
    local self_toys_key  = "self_toys_"..pid.."_get"

    local get_data = redis.call("hget", self_toys_key, playId)
    if not get_data then return -1 end

    redis.call("hdel", self_toys_key, playId)
    return get_data
`

scripts.gy_get_self_toys = `
    local pid = ARGV[1]
    local poundage = ARGV[2]

    local self_toys_key  = "self_toys_"..pid.."_get"
    local array = redis.call("hgetall", self_toys_key)
    local toys = {}
    for i=1,#array,2 do
        toys[#toys + 1] = array[i+1]
    end


    local self_toys_map_key = "self_toys_"..pid.."_toys_map"
    local catch_cnt = redis.call("hkeys", self_toys_map_key)
    
    return cjson.encode({ toys = toys, poundage = poundage, catch_cnt = #catch_cnt, expire = 15})
`

scripts.gy_get_self_toys_cmp = `
    local pid = ARGV[1]

    local cmp_toys_key = "self_toys_"..pid.."_cmp"
    local array = redis.call("hgetall", cmp_toys_key)
    local toys = {}
    for i=1,#array,2 do
        toys[#toys + 1] = array[i+1]
    end
    return cjson.encode({ toys = toys})
`
scripts.gy_get_self_invite_code = `
    local pid = ARGV[1]
    local timestamp = ARGV[2]

    local ivt_num = tonumber(redis.call("hget", "invite_code_input_cnt", pid)) or 0
    local input_code = redis.call("hget", "invite_code_input_map", pid) or "0"
    local invite_code = redis.call("hget", "invite_code_player_map", pid)
    if invite_code then
        return cjson.encode({ ret_code = 0, code = invite_code, invite_num = ivt_num, input_code = input_code})
    end
    
    math.randomseed(timestamp)
    invite_code = math.random(100000, 999999)
    local tryTimes = 3
    while redis.call('HEXISTS', 'invite_code_search_map', invite_code) == 1 do
        if tryTimes > 0 then
            tryTimes = tryTimes - 1
            invite_code = math.random(100000, 999999)
        else
            --没能成功邀请码
            return cjson.encode({ret_code = -1, msg = "创建邀请码失败，请重新进入界面再试" })
        end
    end
    redis.call("hset", 'invite_code_search_map', invite_code, pid)
    redis.call("hset", "invite_code_player_map", pid, invite_code)    

    return cjson.encode({ ret_code = 0, code = invite_code, invite_num = ivt_num, input_code = input_code})
`

scripts.gy_get_input_invite_code = `
    local pid = tostring(ARGV[1])
    local now_input = redis.call("hget", "invite_code_input_map", pid) or "0"
    return cjson.encode({ ret_code  = 0, code = now_input })
`

scripts.gy_input_invite_code = `
    local pid = tostring(ARGV[1])
    local invite_code = ARGV[2]
    local nick_name = ARGV[3]
    local head_img = ARGV[4]

    local now_input = redis.call("hget", "invite_code_input_map", pid)
    if now_input then
        return cjson.encode({ ret_code = -1, ret_msg = "您已经输入过邀请码了"})
    end

    local owner = redis.call("hget", "invite_code_search_map", invite_code)
    if not owner then
        return cjson.encode({ ret_code = -1, ret_msg = "您输入的邀请码不存在"})
    end

    if owner == pid then
       return cjson.encode({ ret_code = -2, ret_msg = "不能输入自己的邀请码"}) 
    end

    local owner_input = redis.call("hget", "invite_code_input_map", owner)
    if owner_input and owner_input == redis.call("hget", "invite_code_player_map", pid) then
        return cjson.encode({ ret_code = -3, ret_msg = "此邀请码玩家已经输入过您的邀请码了"}) 
    end

    redis.call("hset", "invite_code_input_map", pid, invite_code)
    redis.call("HINCRBY", "invite_code_input_cnt", owner, 1)

    --给他的owner添加
    redis.call("hset", "invite_code_"..owner.."_members", pid, cjson.encode({ pid = pid, nick_name = nick_name, head_img = head_img }))

    local cnt = tonumber(redis.call("hget", "invite_code_input_cnt", owner))
    local owner_gold = cnt <= 20 and 10 or 0;
    --添加redis log
    local values = {
        pid = pid,
        invite_code = invite_code,
        owner = owner,
        gold = 20,
        owner_gold = owner_gold
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
        suffix = "month",
        table = "t_share_input_invite_code_log",
        model = "insert",
        values = values
    }));
    if cnt <= 20 then 
        return cjson.encode( { ret_code = 0, gold = 20, owner = owner, owner_gold = 10, owner_toy = owner })
    else
        return cjson.encode( { ret_code = 0, gold = 20, owner_toy = owner })
    end
`

scripts.gy_check_toy_redbag = `
    local pid = ARGV[1]
    local cfg = ARGV[2]
    local time = ARGV[3]

    local cfg_redbag = cjson.decode(cfg)

    --第一步首先算出来兑换这个红包需要多少个娃娃
    local map_need_toys = {}
    for i=1,3 do
        local toy_id = cfg_redbag["need_toy_id_"..i]
        local toy_num = cfg_redbag["need_toy_num_"..i]
        if toy_id ~= "" then
            if map_need_toys[toy_id] == nil then map_need_toys[toy_id] = tonumber(toy_num) 
            else
                map_need_toys[toy_id] = map_need_toys[toy_id] + tonumber(toy_num)
            end
        end
    end

    if map_need_toys == {} then return -1 end

    --第二步看兑换的红包需要的娃娃玩家得到的娃娃够不够
    local self_toys_key  = "self_toys_"..pid.."_get"
    local self_toys_map_key = "self_toys_"..pid.."_toys_map"

    local cost_toys = {}
    local all_keys = redis.call("hkeys", self_toys_key)
    for i,key in pairs(all_keys) do
        local toy_id = redis.call("hget", self_toys_map_key, key)
        if map_need_toys[toy_id] ~= nil and  map_need_toys[toy_id] > 0 then
            cost_toys[#cost_toys + 1] = key
            map_need_toys[toy_id] = map_need_toys[toy_id] - 1
        end
    end

    for k, v in pairs(map_need_toys) do
        if v ~= 0 then return -2 end
    end

    --第三步，把这些娃娃变成已完成状态
    --local cmp_toys_key = "self_toys_"..pid.."_cmp"
    for i, playId in pairs(cost_toys) do
        --local get_data = redis.call("hget", self_toys_key, playId)
        redis.call("hdel", self_toys_key, playId)
        --redis.call("hset", cmp_toys_key, playId, cjson.encode({data = get_data, way = "exchange_redbag"}))
    end

    --练成记录
    local log_key = "toy_redbag_log_"..pid
    redis.call("lpush", log_key, cjson.encode({ time = time, cfg =  cfg }))

    --添加redis log
    local values = {
        pid = pid,
        lianjin_id = cfg_redbag.id,
        lianjin_value = cfg_redbag.redbag,
        cost_toy_id_1 = cfg_redbag.need_toy_id_1,
        cost_toy_num_1 = cfg_redbag.need_toy_num_1,
        cost_toy_id_2 = cfg_redbag.need_toy_id_2,
        cost_toy_num_2 = cfg_redbag.need_toy_num_2,
        cost_toy_id_3 = cfg_redbag.need_toy_id_3,
        cost_toy_num_3 = cfg_redbag.need_toy_num_3,
        lianjin_time = time,
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_lianjin_log",
            model = "insert",
            values = values
    }));


    return cjson.encode({ redbag = cfg_redbag.redbag, cost_toys = cost_toys, cfg = cfg })
`

scripts.gy_extract_toys = `
    local pid = ARGV[1]
    local toys = cjson.decode(ARGV[2])
    local plat_id = ARGV[3]
    local ts = ARGV[4]
    local receiverPhone = ARGV[5]
    local receiverName = ARGV[6]
    local receiverProvince = ARGV[7]
    local receiverCity = ARGV[8]
    local receiverArea = ARGV[9]
    local receiverAddress = ARGV[10]
    local time = ARGV[11]

    local self_toys_key  = "self_toys_"..pid.."_get"
    for i, playId in pairs(toys) do
        if redis.call("HEXISTS", self_toys_key, playId) == 0 then return -1 end
    end

    local firstCfg = nil
    local fetch_key = "fetch_"..pid.."_"..ts

    local fetch_order = {}
    local ready_toys_key = "self_toys_"..pid.."_ready"
    for i, playId in pairs(toys) do
        local get_data = redis.call("hget", self_toys_key, playId)
        local jdata = cjson.decode(get_data)
        if firstCfg == nil then firstCfg = jdata.cfg end
        local order_key =  "fetch_order_"..pid.."_"..jdata.toy_id.."_"..ts
        local order = fetch_order[order_key]
        if order == nil then 
            order = {
                fetchId = fetch_key,
                orderid = order_key,
                pid = pid,
                nick_name = jdata.nick_name,
                platform = plat_id,
                receiverPhone = receiverPhone,
                receiverName = receiverName,
                receiverProvince = receiverProvince,
                receiverCity = receiverCity,
                receiverArea = receiverArea,
                receiverAddress = receiverAddress,
                playId = "",
                toy_id = jdata.toy_id,
                type = "toy",
                toy_cnt = 0,
                state = 1,
                taobao_orderId = ts,
                time = time,
                toy_cfg = jdata.cfg,
            }
            fetch_order[order_key] = order
        end
        order.playId = order.playId..","..playId
        order.toy_cnt = order.toy_cnt + 1
        redis.call("hdel", self_toys_key, playId)
    end
    local orderids = {}
    local fetch_toys_key  = "self_toys_"..pid.."_fetch"
    for key, order in pairs(fetch_order) do
        local jstr = cjson.encode(order)
        redis.call("hset", fetch_toys_key, key, jstr)
        redis.call("lpush", "fetch_cmd_list", jstr)
        redis.call("publish", "fetch_cmd_notify", "")
        orderids[#orderids + 1] = key
    end
    local fetch_log_list  = "self_toys_"..pid.."_fetch_log"
    redis.call("lpush", fetch_log_list, cjson.encode({
        fetch_key = fetch_key,
        time = time,
        orderids = orderids,
        cfg = firstCfg,
        toy_cnt = #toys
    }))
    return 0
`

scripts.gy_fetch_order_notify = `
    local orderid = ARGV[1]
    local pid = ARGV[2]
    local values = cjson.decode(ARGV[3])

    local fetch_toys_key  = "self_toys_"..pid.."_fetch"
    local fetch_data = redis.call("hget", fetch_toys_key, orderid)
    if not fetch_data then return -1 end

    local jfetch = cjson.decode(fetch_data)
    for k, v in pairs(values) do
        jfetch[k] = v
    end
    redis.call("hset", fetch_toys_key, orderid, cjson.encode(jfetch))

    redis.call("lpush", "modify_fetch_cmd_list", cjson.encode({
        orderid = orderid,
        values = values,
    }))
    redis.call("publish", "modify_fetch_cmd_notify", "")
`

scripts.gy_fetch_modify_address = `
    local orderids = cjson.decode(ARGV[1])
    local pid = ARGV[2]
    local values = cjson.decode(ARGV[3])

    local fetch_toys_key  = "self_toys_"..pid.."_fetch"

    for i, orderid in pairs(orderids) do
        if redis.call("HEXISTS", fetch_toys_key, orderid) == 0 then return -1 end
    end

    for i, orderid in pairs(orderids) do
        local fetch_data = redis.call("hget", fetch_toys_key, orderid)
        if not fetch_data then return -1 end

        local jfetch = cjson.decode(fetch_data)
        for k, v in pairs(values) do
            jfetch[k] = v
        end
        redis.call("hset", fetch_toys_key, orderid, cjson.encode(jfetch))

        redis.call("lpush", "modify_fetch_cmd_list", cjson.encode({
            orderid = orderid,
            values = values,
        }))
    end

    redis.call("publish", "modify_fetch_cmd_notify", "")
`

scripts.gy_get_toys_gold = `
    local pid = ARGV[1]

    local self_toys_key  = "self_toys_"..pid.."_get"
    local self_toys_map_key = "self_toys_"..pid.."_toys_map"

    local ret = {}
    local toys = {}
    ret.cnt = 0
    local keys = redis.call("hkeys", self_toys_key)
    for i, playId in pairs(keys) do
        local toy_id = redis.call("hget", self_toys_map_key, playId)
        if toy_id then
            ret.cnt = ret.cnt + 1
            if toys[toy_id] == nil then toys[toy_id] = 1
            else
                toys[toy_id] = toys[toy_id] + 1
            end
        end
    end
    ret.toys = toys

    local values = {
        pid = pid,
        cnt = 1
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_click_toy_redbag_log",
            model = "add_date_cnt",
            values = values
    }));
    return cjson.encode(ret)
`

scripts.gy_get_fetch_log = `
    local pid = ARGV[1]
    local fetch_log_list  = "self_toys_"..pid.."_fetch_log"
    local logs = redis.call("LRANGE", fetch_log_list, 0, -1)
    return cjson.encode({ logs = logs})
`

scripts.gy_get_fetch_detail = `
    local pid = ARGV[1]
    local orderids = cjson.decode(ARGV[2])

    local fetch_toys_key  = "self_toys_"..pid.."_fetch"

    local details = {}
    for i, orderid in pairs(orderids) do
        details[#details + 1] = redis.call("hget", fetch_toys_key, orderid)
    end
    return cjson.encode({ details = details})
`

scripts.gy_extract_exchange_goods = `
    local pid = ARGV[1]
    local nick_name = ARGV[2]
    local mall_id = ARGV[3]
    local plat_id = ARGV[4]
    local ts = ARGV[5]
    local address = cjson.decode(ARGV[6])
    local time = ARGV[7]
    local playId = ARGV[8]
    local cfg = ARGV[9]

    local fetch_key = "fetch_"..pid.."_"..ts
    local order_key = "fetch_order_"..pid.."_"..mall_id.."_"..ts
    local fetch_order = {}
    fetch_order[order_key] = {
        fetchId = fetch_key,
        orderid = order_key,
        pid = pid,
        nick_name = nick_name,
        platform = plat_id,
        receiverPhone = address.phone,
        receiverName = address.name,
        receiverProvince = address.prov,
        receiverCity = address.city,
        receiverArea = address.area,
        receiverAddress = address.address,
        playId = playId,
        toy_id = mall_id,
        type = "mall",
        toy_cnt = 1,
        state = 1,
        taobao_orderId = ts,
        time = time,
        toy_cfg = cfg,
    }
    local orderids = {}
    local fetch_toys_key  = "self_toys_"..pid.."_fetch"
    for key, order in pairs(fetch_order) do
        local jstr = cjson.encode(order)
        redis.call("hset", fetch_toys_key, key, jstr)
        redis.call("lpush", "fetch_cmd_list", jstr)
        orderids[#orderids + 1] = key
    end
    redis.call("publish", "fetch_cmd_notify", "")

    local fetch_log_list  = "self_toys_"..pid.."_fetch_log"
    redis.call("lpush", fetch_log_list, cjson.encode({
        fetch_key = fetch_key,
        time = time,
        orderids = orderids,
        cfg = cfg,
    }))
    return order_key
`

scripts.gy_start_game_h5 = `
    local pid = ARGV[1]
    local rid = ARGV[2]
    local token = ARGV[3]
    local result = ARGV[4]
    local ts = ARGV[5]
    local cfg = ARGV[6]
    local nick_name = ARGV[7]
    local cost = ARGV[8]
    local way = ARGV[9]
    local time = ARGV[10]
    local catch_type = ARGV[11]

    redis.call("hset", "h5_play_toy_map", token, cjson.encode({ pid = pid, rid = rid,
        result = result, ts = ts, cfg = cfg, nick_name = nick_name, ct = catch_type }));

    if way ~= "" then
        local values = {
            pid = pid,
            toy_id = rid,
            catch_time = time,
            catch_type = catch_type,
            cost = cost,
            way = way,
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({
                suffix = "month",
                table = "t_catch_toy_h5_log",
                model = "insert",
                values = values
        }));
    end
    return 0
`

scripts.gy_end_game_h5 = `
    local pid = ARGV[1]
    local token = ARGV[2]
    local succ = ARGV[3]
    local ts = ARGV[4]
    local way = ARGV[5]
    local long_time = ARGV[6]

    local data = redis.call("hget", "h5_play_toy_map", token)
    if not data then return -1 end

    local jdata = cjson.decode(data)
    if jdata.pid ~= pid then return -2 end

    redis.call("hdel", "h5_play_toy_map", token)

    if jdata.result == 0 then return -3 end

    if tonumber(succ) == 1 then
        local jcfg = cjson.decode(jdata.cfg)

        if jcfg.auto_type == nil or jcfg.auto_type == "" then
            local get_data = cjson.encode({ pid = pid, nick_name = jdata.nick_name, toy_id = jdata.rid, cfg = jdata.cfg, time = long_time, playId = token, way = "c2s_h5_end"})
            
            local self_toys_map_key = "self_toys_"..pid.."_toys_map"
            redis.call("hset", self_toys_map_key, token, jdata.rid)

            --redis里面的我的娃娃数据
            local self_toys_key  = "self_toys_"..pid.."_get"
            redis.call("hset", self_toys_key, token, get_data)

            --放入超时队列15天没有处理的娃娃，自动转换成积分
            redis.call("lpush", "expire_toy_list", cjson.encode({ pid = pid, ts = ts, playId = token, cfg = jdata.cfg}))
        end
        --玩家抓到娃娃，记录水线逻辑
        redis.call("lpush", "modify_profits_cmd_list", cjson.encode({ type = "catch_toy", cfg = jdata.cfg}))
        redis.call("publish", "modify_profits_notify", "")

        local values = {
            pid = pid,
            toy_id = jdata.rid,
            catch_time = long_time,
            playId = token,
            way = way,
            catch_type = jdata.ct
        }
        redis.call("lpush", "dbc_log_list", cjson.encode({
                suffix = "month",
                table = "t_catch_succ_h5_log",
                model = "insert",
                values = values
        }));
        return jdata.cfg
    end
    
    return 0

`

scripts.gy_get_toy_catch_info = `
    local toy_id = ARGV[1]

    local toy_catch_log_key = "toy_"..toy_id.."_catch_log"
    local logs = redis.call("lrange", toy_catch_log_key, 0, -1)

    local ranks = {}
    local toy_catch_rank_key = "toy_"..toy_id.."_rank"
    local arrays = redis.call("zrevrange", toy_catch_rank_key, 0 , -1, "WITHSCORES")
    for i=1,#arrays,2 do
        ranks[#ranks + 1] = {
            cnt = arrays[i+1],
            info = redis.call("hget", "catch_player_map", arrays[i])
        }
    end
    return cjson.encode({ logs = logs , ranks = ranks })
`

scripts.gy_deal_expire_toy = `
    local jexpire = cjson.decode(ARGV[1])

    local self_toys_key  = "self_toys_"..jexpire.pid.."_get"
    local get_data = redis.call("hget", self_toys_key, jexpire.playId)
    if not get_data then return -1 end

    redis.call("hdel", self_toys_key, jexpire.playId)
    return 0    
`

scripts.gy_get_invite_detail = `
    local pid = ARGV[1]

    local ret = {}

    ret.total = tonumber(redis.call("hget", "invite_code_profit_map", pid)) or 0
    ret.friends = {}

    local charge_member_key = "invite_code_"..pid.."_members"
    local array = redis.call("hgetall", charge_member_key)
    for i=1,#array,2 do
        ret.friends[#ret.friends + 1] = array[i+1]
    end
    ret.cnt = #ret.friends
    
    local values = {
        pid = pid,
        cnt = 1,
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_open_invite_ui_log",
            model = "add_date_cnt",
            values = values
    }));

    return cjson.encode(ret)
`

scripts.gy_get_invite_redbag = `
    local pid = ARGV[1]
    local mid = ARGV[2]

    local charge_member_key = "invite_code_"..pid.."_members"
    if redis.call("HEXISTS", charge_member_key, mid) == 0 then
        return cjson.encode({ ret_code = -1, ret_msg = "请求错误,错误码！"})
    end

    local jdata = cjson.decode(redis.call("hget", charge_member_key, mid))
    if tonumber(jdata.left) == 0 then
       return cjson.encode({ ret_code = -1, ret_msg = "此好友已经提取完了！！"}) 
    end
    local redbag = jdata.left
    jdata.left = 0
    redis.call("hset", charge_member_key, mid, cjson.encode(jdata))

    local values = {
        pid = pid,
        mid = mid,
        redbag = redbag,
        total = tonumber(redis.call("hget", "invite_code_profit_map", pid)) or 0
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_get_invite_redbag_log",
            model = "insert",
            values = values
    }));

    return cjson.encode({ ret_code = 0, redbag = redbag})
`

scripts.gy_invite_friend_charge = `
    local pid = ARGV[1]
    local amount = ARGV[2]
    local nick_name = ARGV[3]
    local head_img = ARGV[4]

    local profit = amount * 10
    --他输入的邀请马的玩家获得它冲至10%的威信红包
    local invite_code = redis.call("hget", "invite_code_input_map", pid)
    if not invite_code then return end

    local owner = redis.call("hget", "invite_code_search_map", invite_code)
    if not owner then return end

    local charge_member_key = "invite_code_"..owner.."_members"
    local mdata = redis.call("hget", charge_member_key, pid)
    if not mdata then mdata = {} 
    else mdata = cjson.decode(mdata)
    end

    if not mdata.total then mdata.total = 0 end
    if not mdata.left then mdata.left = 0 end

    mdata.pid = pid
    mdata.nick_name = nick_name
    mdata.head_img = head_img
    mdata.total = mdata.total + profit
    mdata.left = mdata.left + profit

    redis.call("hincrby", "invite_code_profit_map", owner, profit)
    redis.call("hset", charge_member_key, pid, cjson.encode(mdata))

    local values = {
        pid = pid,
        amount = amount,
        owner = owner,
        level = 0,
        profit = profit,
        total = mdata.total
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_invite_friend_charge_log",
            model = "insert",
            values = values
    }));
    --添加上级的红包奖励
    profit = amount * 5
    local owner_invite_code = redis.call("hget", "invite_code_input_map", owner)
    if not owner_invite_code then return end

    local owner_owner = redis.call("hget", "invite_code_search_map", owner_invite_code)
    if not owner_owner then return end

    local owner_charge_member_key = "invite_code_"..owner_owner.."_members"
    mdata = redis.call("hget", owner_charge_member_key, owner)
    if not mdata then return end
    mdata = cjson.decode(mdata)
    if not mdata.total then mdata.total = 0 end
    if not mdata.left then mdata.left = 0 end

    mdata.total = mdata.total + profit
    mdata.left = mdata.left + profit

    redis.call("hincrby", "invite_code_profit_map", owner_owner, profit)
    redis.call("hset", owner_charge_member_key, owner, cjson.encode(mdata))

    local values = {
        pid = pid,
        amount = amount,
        owner = owner_owner,
        level = 1,
        profit = profit,
        total = mdata.total
    }
    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_invite_friend_charge_log",
            model = "insert",
            values = values
    }));
`

scripts.ga_close_indiana = `
    local indiana = cjson.decode(ARGV[1])
    local ts = ARGV[2]
    local long_time = ARGV[3]

    for k, v in pairs(indiana.lucks) do
        local playId = "indiana_"..indiana.id.."_"..k.."_"..v.pid.."_"..ts

        --通知gameToy服务器，把获得娃娃的数据爬入mysql
        local get_data = cjson.encode({ pid = v.pid, 
            nick_name = v.nick_name, 
            toy_id = indiana.toy_id, 
            cfg = indiana.toy_cfg, 
            time = long_time, 
            expire = 1, 
            playId = playId, 
            way = "close_indiana"})
        
        local self_toys_map_key = "self_toys_"..v.pid.."_toys_map"
        redis.call("hset", self_toys_map_key, playId, indiana.toy_id)
        --redis里面的我的娃娃数据
        local self_toys_key  = "self_toys_"..v.pid.."_get"
        redis.call("hset", self_toys_key, playId, get_data)

        --放入超时队列15天没有处理的娃娃，自动转换成积分
        redis.call("lpush", "expire_toy_list", cjson.encode({ pid = v.pid, ts = ts, playId = playId, cfg = indiana.toy_cfg}))
        --玩家抓到娃娃，记录水线逻辑
        redis.call("lpush", "modify_profits_cmd_list", cjson.encode({ type = "catch_toy", cfg = indiana.toy_cfg}))
        redis.call("publish", "modify_profits_notify", "")
    end    
    return 0
`

scripts.gy_get_toy_invitingact = `
    local playerid = ARGV[1]
    local tid = ARGV[2]
    local act_id = ARGV[3]
    local toy_cfg = ARGV[4]
    local ts = ARGV[5]
    local long_time = ARGV[6]
    local nickname = ARGV[7]

    local playId = "invitation_toy"..act_id.."_".."_"..playerid.."_"..ts

    --通知gameToy服务器，把获得娃娃的数据爬入mysql
    local get_data = cjson.encode({ pid = playerid, 
        nick_name = nickname, 
        toy_id = tid, 
        cfg = toy_cfg, 
        time = long_time, 
        expire = 1, 
        playId = playId, 
        way = "invitation_toy"})
    
    local self_toys_map_key = "self_toys_"..playerid.."_toys_map"
    redis.call("hset", self_toys_map_key, playId, tid)
    --redis里面的我的娃娃数据
    local self_toys_key  = "self_toys_"..playerid.."_get"
    redis.call("hset", self_toys_key, playId, get_data)

    --放入超时队列15天没有处理的娃娃，自动转换成积分
    redis.call("lpush", "expire_toy_list", cjson.encode({ pid = playerid, ts = ts, playId = playId, cfg = toy_cfg}))
    --玩家抓到娃娃，记录水线逻辑
    redis.call("lpush", "modify_profits_cmd_list", cjson.encode({ type = "catch_toy", cfg = toy_cfg}))
    redis.call("publish", "modify_profits_notify", "")

    local values = {
        pid = playerid,
        toy_level = act_id,
        toy_id = tid
    }

    redis.call("lpush", "dbc_log_list", cjson.encode({
            suffix = "month",
            table = "t_get_invitation_toy_log",
            model = "insert",
            values = values
    }));

    return 0 
`

scripts.gy_get_toy_reversalact = `
    local playerid = ARGV[1]
    local tid = ARGV[2]
    local toy_cfg = ARGV[3]
    local ts = ARGV[4]
    local long_time = ARGV[5]
    local nickname = ARGV[6]

    local playId = "reversalact_toy".."_"..playerid.."_"..ts

    --通知gameToy服务器，把获得娃娃的数据爬入mysql
    local get_data = cjson.encode({ pid = playerid, 
        nick_name = nickname, 
        toy_id = tid, 
        cfg = toy_cfg, 
        time = long_time, 
        expire = 1, 
        playId = playId, 
        way = "reversalact_toy"})
    
    local self_toys_map_key = "self_toys_"..playerid.."_toys_map"
    redis.call("hset", self_toys_map_key, playId, tid)
    --redis里面的我的娃娃数据
    local self_toys_key  = "self_toys_"..playerid.."_get"
    redis.call("hset", self_toys_key, playId, get_data)

    --放入超时队列15天没有处理的娃娃，自动转换成积分
    redis.call("lpush", "expire_toy_list", cjson.encode({ pid = playerid, ts = ts, playId = playId, cfg = toy_cfg}))
    --玩家抓到娃娃，记录水线逻辑
    redis.call("lpush", "modify_profits_cmd_list", cjson.encode({ type = "catch_toy", cfg = toy_cfg}))
    redis.call("publish", "modify_profits_notify", "")

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
        client.hset("dp_gametoy_sha", key, ret)
        client.hset("dp_gametoy_src", key, scripts[key])
    });
}

function loadAllScripts(){
    let cfg = g_configs.redis_configs["game_toy"]    
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