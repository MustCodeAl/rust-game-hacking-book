-- 👀 Ask the host for one copied, read-only view of the current game state.
local entities = game.snapshot()

for _, entity in ipairs(entities) do
    local state = entity.alive and "alive" or "dead"
    game.log(string.format(
        "%s: %s at (%.1f, %.1f, %.1f)",
        entity.name,
        state,
        entity.position.x,
        entity.position.y,
        entity.position.z
    ))
end
