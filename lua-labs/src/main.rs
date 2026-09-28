use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use anyhow::{Context, Result};
use mlua::{HookTriggers, Lua, LuaOptions, StdLib, Table, VmState};

#[derive(Clone, Debug)]
struct EntitySnapshot {
    id: u32,
    name: &'static str,
    position: [f32; 3],
    alive: bool,
}

#[derive(Clone, Debug)]
enum RequestedAction {
    SelectEntity(u32),
    PlaceMarker { x: f32, y: f32, z: f32 },
}

fn sample_snapshot() -> Vec<EntitySnapshot> {
    vec![
        EntitySnapshot {
            id: 0,
            name: "local_player",
            position: [12.0, 8.0, 2.0],
            alive: true,
        },
        EntitySnapshot {
            id: 1,
            name: "bot_alpha",
            position: [19.0, 11.0, 2.0],
            alive: true,
        },
        EntitySnapshot {
            id: 2,
            name: "bot_bravo",
            position: [4.0, 28.0, 2.0],
            alive: false,
        },
    ]
}

fn snapshot_table(lua: &Lua, entities: &[EntitySnapshot]) -> mlua::Result<Table> {
    let result = lua.create_table()?;

    for (index, entity) in entities.iter().enumerate() {
        let item = lua.create_table()?;
        item.set("id", entity.id)?;
        item.set("name", entity.name)?;
        item.set("alive", entity.alive)?;

        let position = lua.create_table()?;
        position.set("x", entity.position[0])?;
        position.set("y", entity.position[1])?;
        position.set("z", entity.position[2])?;
        item.set("position", position)?;

        // Lua sequences begin at 1, so Rust's zero-based index moves forward once. 🔢
        result.set(index + 1, item)?;
    }

    Ok(result)
}

fn install_game_api(lua: &Lua, actions: Arc<Mutex<Vec<RequestedAction>>>) -> mlua::Result<()> {
    let game = lua.create_table()?;

    game.set(
        "snapshot",
        lua.create_function(|lua, ()| snapshot_table(lua, &sample_snapshot()))?,
    )?;

    game.set(
        "distance",
        lua.create_function(|_, (a, b): (Table, Table)| {
            let dx = a.get::<f32>("x")? - b.get::<f32>("x")?;
            let dy = a.get::<f32>("y")? - b.get::<f32>("y")?;
            let dz = a.get::<f32>("z")? - b.get::<f32>("z")?;
            Ok(dx.hypot(dy).hypot(dz))
        })?,
    )?;

    game.set(
        "log",
        lua.create_function(|_, message: String| {
            println!("[lua] {message}");
            Ok(())
        })?,
    )?;

    game.set(
        "request",
        lua.create_function(move |_, request: Table| {
            let kind = request.get::<String>("kind")?;
            let action = match kind.as_str() {
                "select_entity" => RequestedAction::SelectEntity(request.get("id")?),
                "place_marker" => RequestedAction::PlaceMarker {
                    x: request.get("x")?,
                    y: request.get("y")?,
                    z: request.get("z")?,
                },
                _ => {
                    return Err(mlua::Error::RuntimeError(format!(
                        "unsupported action type {kind:?}"
                    )));
                }
            };

            actions
                .lock()
                .map_err(|_| mlua::Error::RuntimeError("action queue is unavailable".into()))?
                .push(action);
            Ok(())
        })?,
    )?;

    lua.globals().set("game", game)
}

fn describe_action(action: &RequestedAction) -> String {
    match action {
        RequestedAction::SelectEntity(id) => format!("select entity {id}"),
        RequestedAction::PlaceMarker { x, y, z } => {
            format!("place marker at ({x:.2}, {y:.2}, {z:.2})")
        }
    }
}

fn main() -> Result<()> {
    let script_path = std::env::args_os()
        .nth(1)
        .map_or_else(|| PathBuf::from("scripts/observer.lua"), PathBuf::from);
    let source = fs::read_to_string(&script_path)
        .with_context(|| format!("could not read {}", script_path.display()))?;

    // Only the libraries these lessons need are loaded. There is no io, os, debug,
    // package loader, arbitrary memory API, or Windows command launcher. 🔒
    let lua = Lua::new_with(
        StdLib::TABLE | StdLib::STRING | StdLib::MATH,
        LuaOptions::default(),
    )?;
    lua.set_memory_limit(4 * 1024 * 1024)?;

    // Stop a script that spends too long without returning control to the host.
    let hook_calls = Arc::new(Mutex::new(0_u32));
    let hook_counter = Arc::clone(&hook_calls);
    lua.set_hook(
        HookTriggers::new().every_nth_instruction(1_000),
        move |_, _| {
            let mut calls = hook_counter
                .lock()
                .map_err(|_| mlua::Error::RuntimeError("hook counter failed".into()))?;
            *calls += 1;
            if *calls > 100 {
                return Err(mlua::Error::RuntimeError(
                    "script exceeded its instruction budget".into(),
                ));
            }
            Ok(VmState::Continue)
        },
    )?;

    let actions = Arc::new(Mutex::new(Vec::new()));
    install_game_api(&lua, Arc::clone(&actions))?;
    lua.load(&source)
        .set_name(script_path.to_string_lossy())
        .exec()
        .with_context(|| format!("Lua script {} failed", script_path.display()))?;

    let actions = actions
        .lock()
        .map_err(|_| anyhow::anyhow!("action queue is unavailable"))?;
    println!("accepted {} bounded action(s)", actions.len());
    for action in actions.iter() {
        println!("  ✅ {}", describe_action(action));
    }

    Ok(())
}
