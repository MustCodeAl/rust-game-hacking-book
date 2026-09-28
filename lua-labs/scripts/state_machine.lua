local state = "observe"
local selected = nil

for step = 1, 3 do
    if state == "observe" then
        local entities = game.snapshot()
        selected = entities[2]
        state = selected and "mark" or "stop"
    elseif state == "mark" then
        -- ✅ Request one narrow host action; never execute an arbitrary command string.
        game.request({
            kind = "place_marker",
            x = selected.position.x,
            y = selected.position.y,
            z = selected.position.z,
        })
        state = "stop"
    elseif state == "stop" then
        game.log("state machine stopped cleanly")
        break
    end
end
