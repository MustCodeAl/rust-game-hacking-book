//! NPC brain lab for Lessons 4.9 and 4.10.
//!
//! A toy guard senses, decides, and acts once per tick, the way an NPC does
//! inside a game loop. It shows perception (distance, view cone, and line of
//! sight), a finite-state machine with a deliberate reaction delay, and
//! utility scoring for choosing among actions. Nothing here touches a game.

use std::ops::{Add, Mul, Sub};

/// How far the guard can see.
const VIEW_DISTANCE: f32 = 10.0;
/// Cosine of half the view cone's angle: 0.5 means 60 degrees either side.
const VIEW_CONE_COS: f32 = 0.5;
/// Consecutive ticks the player must be visible before the guard reacts.
const REACTION_TICKS: u32 = 3;
const ATTACK_RANGE: f32 = 1.5;
/// Ticks spent searching the last known position before giving up.
const SEARCH_TICKS: u32 = 4;
const FLEE_HEALTH: u32 = 25;
/// Distance covered in one tick.
const SPEED: f32 = 1.0;
/// Spacing of the samples in the line-of-sight check.
const SIGHT_STEP: f32 = 0.1;
/// Guard decisions per second, so each tick lasts 1000 / 10 = 100 ms.
const TICKS_PER_SECOND: u32 = 10;

#[derive(Clone, Copy, Debug, PartialEq)]
struct Vec2 {
    x: f32,
    y: f32,
}

impl Vec2 {
    const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    fn length(self) -> f32 {
        self.x.hypot(self.y)
    }

    fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y
    }

    fn normalized(self) -> Option<Self> {
        let length = self.length();
        if length > f32::EPSILON {
            Some(self * length.recip())
        } else {
            None
        }
    }
}

impl Add for Vec2 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y)
    }
}

impl Sub for Vec2 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y)
    }
}

impl Mul<f32> for Vec2 {
    type Output = Self;
    fn mul(self, scale: f32) -> Self {
        Self::new(self.x * scale, self.y * scale)
    }
}

/// An axis-aligned box of solid level geometry.
#[derive(Clone, Copy, Debug)]
struct Wall {
    min: Vec2,
    max: Vec2,
}

impl Wall {
    fn contains(self, point: Vec2) -> bool {
        (self.min.x..=self.max.x).contains(&point.x) && (self.min.y..=self.max.y).contains(&point.y)
    }
}

/// A crude ray cast: walk along the segment in small steps and fail if any
/// sample lands inside a wall. Engines trace against real collision
/// geometry, but the question they answer is the same one.
fn line_of_sight(from: Vec2, to: Vec2, walls: &[Wall]) -> bool {
    let offset = to - from;
    let distance = offset.length();
    let Some(direction) = offset.normalized() else {
        return true;
    };
    let mut travelled = 0.0;
    while travelled < distance {
        let sample = from + direction * travelled;
        if walls.iter().any(|wall| wall.contains(sample)) {
            return false;
        }
        travelled += SIGHT_STEP;
    }
    true
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum GuardState {
    Patrol,
    Chase,
    Attack,
    Search { ticks: u32 },
    Flee,
}

/// What the guard perceives this tick. The decision reads only this, so it
/// can be tested without any geometry.
#[derive(Clone, Copy, Debug)]
struct Senses {
    sees_player: bool,
    seen_for: u32,
    distance: f32,
    health: u32,
}

/// The finite-state machine. Every transition has a stated reason.
fn decide(current: GuardState, senses: Senses) -> GuardState {
    if senses.health <= FLEE_HEALTH {
        return GuardState::Flee;
    }
    // The reaction delay: one glimpse is not enough to start a chase.
    let reacted = senses.sees_player && senses.seen_for >= REACTION_TICKS;
    match current {
        GuardState::Flee => GuardState::Flee,
        GuardState::Patrol | GuardState::Search { .. } if reacted => GuardState::Chase,
        GuardState::Patrol => GuardState::Patrol,
        GuardState::Chase | GuardState::Attack if senses.sees_player => {
            if senses.distance <= ATTACK_RANGE {
                GuardState::Attack
            } else {
                GuardState::Chase
            }
        }
        GuardState::Chase | GuardState::Attack => GuardState::Search { ticks: 0 },
        GuardState::Search { ticks } if ticks >= SEARCH_TICKS => GuardState::Patrol,
        GuardState::Search { ticks } => GuardState::Search { ticks: ticks + 1 },
    }
}

#[derive(Debug)]
struct Guard {
    position: Vec2,
    facing: Vec2,
    health: u32,
    state: GuardState,
    /// Consecutive ticks the player has been visible.
    seen_for: u32,
    /// Where the player was last seen. The guard never reads the player's
    /// true position except through its own senses.
    last_known: Option<Vec2>,
    route: Vec<Vec2>,
    next_waypoint: usize,
}

#[derive(Clone, Copy, Debug)]
struct TickReport {
    sees_player: bool,
    state: GuardState,
}

impl Guard {
    fn new(position: Vec2, facing: Vec2, route: Vec<Vec2>) -> Self {
        Self {
            position,
            facing,
            health: 100,
            state: GuardState::Patrol,
            seen_for: 0,
            last_known: None,
            route,
            next_waypoint: 0,
        }
    }

    fn can_see(&self, target: Vec2, walls: &[Wall]) -> bool {
        let offset = target - self.position;
        if offset.length() > VIEW_DISTANCE {
            return false;
        }
        let Some(direction) = offset.normalized() else {
            return true;
        };
        if direction.dot(self.facing) < VIEW_CONE_COS {
            return false;
        }
        line_of_sight(self.position, target, walls)
    }

    /// Steps toward `target`, turning to face it. Returns true on arrival.
    fn move_toward(&mut self, target: Vec2) -> bool {
        let offset = target - self.position;
        let Some(direction) = offset.normalized() else {
            return true;
        };
        self.facing = direction;
        if offset.length() <= SPEED {
            self.position = target;
            true
        } else {
            self.position = self.position + direction * SPEED;
            false
        }
    }

    /// Sense, decide, act: one tick of the NPC's part of the game loop.
    fn tick(&mut self, player: Vec2, walls: &[Wall]) -> TickReport {
        // Sense.
        let sees_player = self.can_see(player, walls);
        self.seen_for = if sees_player { self.seen_for + 1 } else { 0 };
        if sees_player {
            self.last_known = Some(player);
        }
        let senses = Senses {
            sees_player,
            seen_for: self.seen_for,
            distance: (player - self.position).length(),
            health: self.health,
        };

        // Decide.
        self.state = decide(self.state, senses);

        // Act.
        match self.state {
            GuardState::Patrol => {
                if let Some(&waypoint) = self.route.get(self.next_waypoint)
                    && self.move_toward(waypoint)
                {
                    self.next_waypoint = (self.next_waypoint + 1) % self.route.len();
                }
            }
            GuardState::Chase | GuardState::Search { .. } => {
                if let Some(spot) = self.last_known {
                    self.move_toward(spot);
                }
            }
            GuardState::Attack => {}
            GuardState::Flee => {
                if let Some(spot) = self.last_known {
                    let away = self.position + (self.position - spot);
                    self.move_toward(away);
                }
            }
        }

        TickReport {
            sees_player,
            state: self.state,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Choice {
    Attack,
    TakeCover,
    Heal,
}

#[derive(Clone, Copy, Debug)]
struct Situation {
    /// Remaining health as a fraction from 0.0 to 1.0.
    health: f32,
    enemy_visible: bool,
    in_cover: bool,
    potions: u32,
}

/// How attractive each option is right now, from 0.0 (pointless) upward.
fn score(choice: Choice, situation: Situation) -> f32 {
    match choice {
        Choice::Attack if situation.enemy_visible => 0.4 + 0.6 * situation.health,
        Choice::TakeCover if situation.enemy_visible && !situation.in_cover => {
            0.9 - 0.6 * situation.health
        }
        Choice::Heal if situation.potions > 0 => 1.0 - situation.health,
        _ => 0.0,
    }
}

/// Utility scoring: score every option and run the best one, or nothing if
/// no option scores above zero.
fn choose(situation: Situation) -> Option<Choice> {
    [Choice::Attack, Choice::TakeCover, Choice::Heal]
        .into_iter()
        .map(|choice| (choice, score(choice, situation)))
        .filter(|&(_, value)| value > 0.0)
        .max_by(|(_, left), (_, right)| left.total_cmp(right))
        .map(|(choice, _)| choice)
}

fn main() {
    println!("1. A guard with a reaction delay, a chase, and a search");
    let walls = [Wall {
        min: Vec2::new(5.5, -1.0),
        max: Vec2::new(6.5, 1.0),
    }];
    let post = Vec2::new(0.0, 0.0);
    let mut guard = Guard::new(post, Vec2::new(1.0, 0.0), vec![post]);

    for tick in 1..=16 {
        // The player stands in the open for seven ticks, then slips behind
        // the wall.
        let player = if tick <= 7 {
            Vec2::new(5.0, 0.0)
        } else {
            Vec2::new(8.0, 0.0)
        };
        let report = guard.tick(player, &walls);
        let state = format!("{:?}", report.state);
        let millis = tick * 1000 / TICKS_PER_SECOND;
        println!(
            "  tick {tick:>2} ({millis:>4} ms)  player at ({:>3.1}, {:>3.1})  sees: {:<5}  state: {state:<20} guard at ({:>3.1}, {:>3.1})",
            player.x, player.y, report.sees_player, guard.position.x, guard.position.y
        );
    }

    println!("\n2. Utility scoring: score every option, run the best one");
    let situations = [
        (
            "healthy, enemy in view",
            Situation {
                health: 1.0,
                enemy_visible: true,
                in_cover: false,
                potions: 1,
            },
        ),
        (
            "hurt, enemy in view, exposed",
            Situation {
                health: 0.3,
                enemy_visible: true,
                in_cover: false,
                potions: 1,
            },
        ),
        (
            "hurt, enemy in view, in cover",
            Situation {
                health: 0.3,
                enemy_visible: true,
                in_cover: true,
                potions: 1,
            },
        ),
        (
            "hurt, in cover, no potions left",
            Situation {
                health: 0.3,
                enemy_visible: true,
                in_cover: true,
                potions: 0,
            },
        ),
        (
            "healthy, nobody in view",
            Situation {
                health: 1.0,
                enemy_visible: false,
                in_cover: false,
                potions: 1,
            },
        ),
    ];
    for (label, situation) in situations {
        let scores = [Choice::Attack, Choice::TakeCover, Choice::Heal]
            .map(|choice| format!("{choice:?} {:.2}", score(choice, situation)));
        println!(
            "  {label:<32} {}  ->  {:?}",
            scores.join(", "),
            choose(situation)
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn senses(sees_player: bool, seen_for: u32, distance: f32) -> Senses {
        Senses {
            sees_player,
            seen_for,
            distance,
            health: 100,
        }
    }

    fn guard_at_origin_facing_east() -> Guard {
        let post = Vec2::new(0.0, 0.0);
        Guard::new(post, Vec2::new(1.0, 0.0), vec![post])
    }

    #[test]
    fn one_glimpse_is_not_enough_to_react() {
        assert_eq!(
            decide(GuardState::Patrol, senses(true, 1, 5.0)),
            GuardState::Patrol
        );
        assert_eq!(
            decide(GuardState::Patrol, senses(true, 2, 5.0)),
            GuardState::Patrol
        );
        assert_eq!(
            decide(GuardState::Patrol, senses(true, 3, 5.0)),
            GuardState::Chase
        );
    }

    #[test]
    fn a_chase_turns_into_an_attack_in_range() {
        assert_eq!(
            decide(GuardState::Chase, senses(true, 9, 5.0)),
            GuardState::Chase
        );
        assert_eq!(
            decide(GuardState::Chase, senses(true, 9, 1.0)),
            GuardState::Attack
        );
    }

    #[test]
    fn a_lost_target_is_searched_for_then_abandoned() {
        let mut state = decide(GuardState::Attack, senses(false, 0, 3.0));
        assert_eq!(state, GuardState::Search { ticks: 0 });
        for _ in 0..SEARCH_TICKS {
            state = decide(state, senses(false, 0, 3.0));
        }
        assert_eq!(
            state,
            GuardState::Search {
                ticks: SEARCH_TICKS
            }
        );
        assert_eq!(decide(state, senses(false, 0, 3.0)), GuardState::Patrol);
    }

    #[test]
    fn low_health_overrides_every_other_state() {
        let hurt = Senses {
            health: 20,
            ..senses(true, 9, 1.0)
        };
        for state in [
            GuardState::Patrol,
            GuardState::Chase,
            GuardState::Attack,
            GuardState::Search { ticks: 2 },
        ] {
            assert_eq!(decide(state, hurt), GuardState::Flee);
        }
    }

    #[test]
    fn perception_checks_distance_cone_and_walls() {
        let guard = guard_at_origin_facing_east();
        let wall = [Wall {
            min: Vec2::new(2.0, -1.0),
            max: Vec2::new(3.0, 1.0),
        }];
        assert!(guard.can_see(Vec2::new(5.0, 0.0), &[]));
        assert!(!guard.can_see(Vec2::new(0.0, 5.0), &[]), "outside the cone");
        assert!(!guard.can_see(Vec2::new(15.0, 0.0), &[]), "too far away");
        assert!(
            !guard.can_see(Vec2::new(5.0, 0.0), &wall),
            "wall in the way"
        );
        assert!(
            guard.can_see(Vec2::new(4.0, 3.0), &wall),
            "the wall is not between them"
        );
    }

    #[test]
    fn the_guard_reacts_after_a_delay_then_closes_in() {
        let mut guard = guard_at_origin_facing_east();
        let player = Vec2::new(5.0, 0.0);
        let states: Vec<GuardState> = (0..7).map(|_| guard.tick(player, &[]).state).collect();
        assert_eq!(
            states,
            [
                GuardState::Patrol,
                GuardState::Patrol,
                GuardState::Chase,
                GuardState::Chase,
                GuardState::Chase,
                GuardState::Chase,
                GuardState::Attack,
            ]
        );
        assert_eq!(guard.position, Vec2::new(4.0, 0.0));
    }

    #[test]
    fn utility_scoring_picks_the_best_option_or_none() {
        let situation = |health, enemy_visible, in_cover, potions| Situation {
            health,
            enemy_visible,
            in_cover,
            potions,
        };
        assert_eq!(choose(situation(1.0, true, false, 1)), Some(Choice::Attack));
        assert_eq!(
            choose(situation(0.3, true, false, 1)),
            Some(Choice::TakeCover)
        );
        assert_eq!(choose(situation(0.3, true, true, 1)), Some(Choice::Heal));
        assert_eq!(choose(situation(0.3, true, true, 0)), Some(Choice::Attack));
        assert_eq!(choose(situation(1.0, false, false, 1)), None);
    }
}
