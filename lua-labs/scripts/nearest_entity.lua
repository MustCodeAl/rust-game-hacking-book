local entities = game.snapshot()
local local_player = entities[1] -- Lua sequences begin at 1. 🔢
local nearest = nil
local nearest_distance = math.huge

for index = 2, #entities do
    local candidate = entities[index]
    if candidate.alive then
        local distance = game.distance(local_player.position, candidate.position)
        if distance < nearest_distance then
            nearest = candidate
            nearest_distance = distance
        end
    end
end

if nearest then
    game.log(string.format("nearest living entity: %s (%.2f units)", nearest.name, nearest_distance))
    game.request({ kind = "select_entity", id = nearest.id })
end
