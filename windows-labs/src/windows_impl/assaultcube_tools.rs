//! AssaultCube 1.2.0.2 aimbot and ESP, ported from the original course code.

#![cfg(target_arch = "x86")]

use std::{
    arch::asm,
    ptr,
    sync::atomic::{AtomicI32, AtomicUsize, Ordering},
};

use anyhow::Result;

use super::{LocalPatch, near_call, near_jump};

const LOCAL_PLAYER_ROOT: usize = 0x0050_9B74;
const ENTITY_LIST_ROOT: usize = 0x0050_F4F8;
const PLAYER_COUNT: usize = 0x0050_F500;
const MAX_PLAYERS: usize = 32;

const POSITION_X: usize = 0x04;
const POSITION_Y: usize = 0x08;
const POSITION_Z: usize = 0x0C;
const VIEW_YAW: usize = 0x40;
const VIEW_PITCH: usize = 0x44;
const PLAYER_NAME: usize = 0x225;
const DEAD_FLAG: usize = 0x338;

const ESP_HOOK: usize = 0x0040_BE7E;
const ESP_RESUME: usize = 0x0040_BE83;
const PRINT_TEXT: usize = 0x0041_9880;

static ESP_X: [AtomicI32; MAX_PLAYERS] = [const { AtomicI32::new(-1) }; MAX_PLAYERS];
static ESP_Y: [AtomicI32; MAX_PLAYERS] = [const { AtomicI32::new(-1) }; MAX_PLAYERS];
static ESP_NAME: [AtomicUsize; MAX_PLAYERS] = [const { AtomicUsize::new(0) }; MAX_PLAYERS];
static EMPTY_TEXT: [u8; 1] = [0];

#[derive(Clone, Copy, Debug)]
struct Vec3 {
    x: f32,
    y: f32,
    z: f32,
}

#[derive(Clone, Copy, Debug)]
struct Angles {
    yaw: f32,
    pitch: f32,
}

unsafe fn read_u32(address: usize) -> u32 {
    // SAFETY: callers pass fields from the version-pinned AssaultCube profile.
    unsafe { ptr::read_volatile(address as *const u32) }
}

unsafe fn read_f32(address: usize) -> f32 {
    // SAFETY: callers pass aligned float fields from the verified player layout.
    unsafe { ptr::read_volatile(address as *const f32) }
}

fn local_player() -> Option<usize> {
    // SAFETY: this is the verified global player-pointer slot.
    let player = unsafe { read_u32(LOCAL_PLAYER_ROOT) } as usize;
    (player != 0).then_some(player)
}

fn player_count() -> usize {
    // SAFETY: this global is a signed player count in the supported build.
    let raw = unsafe { ptr::read_volatile(PLAYER_COUNT as *const i32) };
    raw.clamp(0, MAX_PLAYERS as i32) as usize
}

fn entity_at(index: usize) -> Option<usize> {
    if index >= player_count() {
        return None;
    }
    // SAFETY: this global contains the start of the 32-bit entity pointer array.
    let list = unsafe { read_u32(ENTITY_LIST_ROOT) } as usize;
    if list == 0 {
        return None;
    }
    let slot = list.checked_add(index.checked_mul(4)?)?;
    // SAFETY: the clamped index selects one pointer-sized array slot.
    let entity = unsafe { read_u32(slot) } as usize;
    (entity != 0).then_some(entity)
}

fn position(entity: usize) -> Option<Vec3> {
    // SAFETY: the entity was obtained from the verified list.
    let result = unsafe {
        Vec3 {
            x: read_f32(entity + POSITION_X),
            y: read_f32(entity + POSITION_Y),
            z: read_f32(entity + POSITION_Z),
        }
    };
    [result.x, result.y, result.z]
        .iter()
        .all(|value| value.is_finite() && value.abs() < 100_000.0)
        .then_some(result)
}

fn view_angles(entity: usize) -> Option<Angles> {
    // SAFETY: the verified player layout stores yaw and pitch at these offsets.
    let result = unsafe {
        Angles {
            yaw: read_f32(entity + VIEW_YAW),
            pitch: read_f32(entity + VIEW_PITCH),
        }
    };
    (result.yaw.is_finite() && result.pitch.is_finite()).then_some(result)
}

fn is_alive(entity: usize) -> bool {
    // SAFETY: the verified layout stores zero for a living player here.
    unsafe { read_u32(entity + DEAD_FLAG) == 0 }
}

fn aim_from_to(from: Vec3, to: Vec3) -> (f32, Angles) {
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    let dz = to.z - from.z;
    let horizontal = dx.hypot(dy);

    let yaw = dy.atan2(dx).to_degrees() + 90.0;
    let pitch = dz.atan2(horizontal).to_degrees();
    (horizontal, Angles { yaw, pitch })
}

pub fn assaultcube_aim_once() -> Result<()> {
    let Some(player) = local_player() else {
        return Ok(());
    };
    let Some(player_position) = position(player) else {
        return Ok(());
    };
    let mut closest: Option<(f32, Angles)> = None;

    // Index zero is the local player in the course build.
    for index in 1..player_count() {
        let Some(enemy) = entity_at(index) else {
            continue;
        };
        if !is_alive(enemy) {
            continue;
        }
        let Some(enemy_position) = position(enemy) else {
            continue;
        };
        let candidate = aim_from_to(player_position, enemy_position);
        if closest.is_none_or(|current| candidate.0 < current.0) {
            closest = Some(candidate);
        }
    }

    if let Some((_, angles)) = closest {
        // SAFETY: player is live and both values were calculated from finite data.
        unsafe {
            ptr::write_volatile((player + VIEW_YAW) as *mut f32, angles.yaw);
            ptr::write_volatile((player + VIEW_PITCH) as *mut f32, angles.pitch);
        }
    }
    Ok(())
}

fn shortest_angle_difference(from: f32, to: f32) -> f32 {
    (from - to + 180.0).rem_euclid(360.0) - 180.0
}

pub fn assaultcube_update_esp() -> Result<()> {
    let Some(player) = local_player() else {
        return Ok(());
    };
    let Some(player_position) = position(player) else {
        return Ok(());
    };
    let Some(player_view) = view_angles(player) else {
        return Ok(());
    };
    let count = player_count();

    for index in 1..MAX_PLAYERS {
        if index < count {
            let Some(enemy) = entity_at(index) else {
                continue;
            };
            let Some(enemy_position) = position(enemy) else {
                continue;
            };
            let (_, target) = aim_from_to(player_position, enemy_position);
            let yaw_difference = shortest_angle_difference(player_view.yaw, target.yaw);
            let pitch_difference = player_view.pitch - target.pitch;
            let x = (1200.0 + yaw_difference * -30.0).round() as i32;
            let y = (900.0 + pitch_difference * 25.0).round() as i32;
            ESP_X[index].store(x, Ordering::Release);
            ESP_Y[index].store(y, Ordering::Release);
            ESP_NAME[index].store(enemy + PLAYER_NAME, Ordering::Release);
        } else {
            ESP_X[index].store(-1, Ordering::Release);
            ESP_Y[index].store(-1, Ordering::Release);
            ESP_NAME[index].store(0, Ordering::Release);
        }
    }
    Ok(())
}

unsafe fn print_text(text: *const u8, x: u32, y: u32) {
    // The game's function expects text in ECX and x/y as two stack arguments.
    // The caller removes those eight argument bytes, matching the original code.
    // SAFETY: PRINT_TEXT and the calling convention are verified for 1.2.0.2.
    unsafe {
        asm!(
            "mov ecx, {text}",
            "push {y}",
            "push {x}",
            "call {function}",
            "add esp, 8",
            text = in(reg) text,
            x = in(reg) x,
            y = in(reg) y,
            function = in(reg) PRINT_TEXT,
            clobber_abi("C"),
        );
    }
}

extern "C" fn draw_esp_names() {
    for index in 1..player_count() {
        let x = ESP_X[index].load(Ordering::Acquire);
        let y = ESP_Y[index].load(Ordering::Acquire);
        let name = ESP_NAME[index].load(Ordering::Acquire);
        if !(0..=2400).contains(&x) || !(0..=1800).contains(&y) || name == 0 {
            continue;
        }
        // SAFETY: the entity name pointer and internal print function belong to
        // the current verified frame. The cave saved all general registers.
        unsafe { print_text(name as *const u8, (x + 200) as u32, y as u32) };
    }
}

#[unsafe(naked)]
unsafe extern "C" fn assaultcube_esp_cave() {
    core::arch::naked_asm!(
        // Replay the original print call but use an empty string so the normal
        // center-screen text does not get printed twice.
        "lea ecx, [{empty}]",
        "call {print}",
        "pushfd",
        "pushad",
        "call {draw}",
        "popad",
        "popfd",
        "jmp {resume}",
        empty = sym EMPTY_TEXT,
        print = const PRINT_TEXT,
        draw = sym draw_esp_names,
        resume = const ESP_RESUME,
    );
}

pub fn install_assaultcube_esp_hook() -> Result<LocalPatch> {
    let expected = near_call(ESP_HOOK, PRINT_TEXT)?;
    let cave = assaultcube_esp_cave as *const () as usize;
    let replacement = near_jump(ESP_HOOK, cave)?;
    LocalPatch::apply(ESP_HOOK, &expected, &replacement)
}

#[cfg(test)]
mod tests {
    use super::shortest_angle_difference;

    #[test]
    fn angular_difference_wraps_at_the_seam() {
        assert!((shortest_angle_difference(359.0, 1.0) + 2.0).abs() < f32::EPSILON);
        assert!((shortest_angle_difference(1.0, 359.0) - 2.0).abs() < f32::EPSILON);
    }
}
