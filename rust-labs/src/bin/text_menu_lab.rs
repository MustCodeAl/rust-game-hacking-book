//! The state machine behind an in-game text menu, with no graphics API in
//! sight.
//!
//! Drawing the menu is the easy half: you call the game's own text function
//! once per line. The half that actually goes wrong is the bookkeeping —
//! a cursor that wraps in both directions, keys that must fire once per press
//! rather than once per frame, and a render path that must not allocate.
//!
//! Everything here is portable safe Rust, so the rules can be tested without
//! attaching to anything.
//!
//! ```text
//! cargo run --bin text_menu_lab
//! cargo test --bin text_menu_lab
//! ```

/// One switchable feature in the menu.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct MenuItem {
    label: &'static str,
    enabled: bool,
}

/// What the reader pressed this frame. A real build fills this in from
/// `GetAsyncKeyState`; the lab supplies it directly so the rules stay testable.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
struct KeyFrame {
    up: bool,
    down: bool,
    toggle: bool,
}

/// Level-to-edge conversion. `GetAsyncKeyState` reports whether a key *is*
/// down, which is true on every frame of a single press. A menu needs to know
/// when it *became* down, so the previous frame has to be remembered.
#[derive(Clone, Copy, Debug, Default)]
struct EdgeDetector {
    previous: KeyFrame,
}

impl EdgeDetector {
    const fn new() -> Self {
        Self {
            previous: KeyFrame {
                up: false,
                down: false,
                toggle: false,
            },
        }
    }

    /// Returns the keys that went from up to down between the last frame and
    /// this one.
    fn edges(&mut self, current: KeyFrame) -> KeyFrame {
        let edges = KeyFrame {
            up: current.up && !self.previous.up,
            down: current.down && !self.previous.down,
            toggle: current.toggle && !self.previous.toggle,
        };
        self.previous = current;
        edges
    }
}

#[derive(Debug)]
struct Menu {
    items: Vec<MenuItem>,
    cursor: usize,
    open: bool,
    /// Reused every frame so the render path never allocates.
    lines: Vec<String>,
}

/// The marker byte an engine looks for when it embeds colour in a string. The
/// value is build-specific: confirm it against your target rather than
/// trusting this constant.
const COLOUR_MARKER: char = '\u{0c}';
const COLOUR_SELECTED: char = '3';
const COLOUR_ENABLED: char = '0';
const COLOUR_DISABLED: char = '4';

impl Menu {
    fn new(labels: &[&'static str]) -> Self {
        let items: Vec<MenuItem> = labels
            .iter()
            .map(|label| MenuItem {
                label,
                enabled: false,
            })
            .collect();
        let capacity = items.len();
        Self {
            items,
            cursor: 0,
            open: false,
            lines: Vec::with_capacity(capacity),
        }
    }

    /// Moves the cursor up one row, wrapping to the bottom.
    ///
    /// The wrap is the part people get wrong. `(cursor - 1) % len` looks
    /// right and underflows on an unsigned cursor the moment it is zero,
    /// which panics in debug and produces an enormous index in release.
    /// Handling the zero case explicitly says exactly what should happen.
    fn move_up(&mut self) {
        let Some(last) = self.items.len().checked_sub(1) else {
            return;
        };
        self.cursor = if self.cursor == 0 {
            last
        } else {
            self.cursor - 1
        };
    }

    /// Moves the cursor down one row, wrapping to the top.
    fn move_down(&mut self) {
        if self.items.is_empty() {
            return;
        }
        let next = self.cursor + 1;
        self.cursor = if next == self.items.len() { 0 } else { next };
    }

    fn toggle_selected(&mut self) {
        if let Some(item) = self.items.get_mut(self.cursor) {
            item.enabled = !item.enabled;
        }
    }

    /// Applies one frame of input. Only edges act, so holding a key moves the
    /// cursor exactly one row.
    fn update(&mut self, edges: KeyFrame) {
        if !self.open {
            return;
        }
        if edges.up {
            self.move_up();
        }
        if edges.down {
            self.move_down();
        }
        if edges.toggle {
            self.toggle_selected();
        }
    }

    fn is_enabled(&self, label: &str) -> bool {
        self.items
            .iter()
            .any(|item| item.label == label && item.enabled)
    }

    /// Builds the lines to hand to the game's text function.
    ///
    /// Returns a borrowed slice and clears rather than reallocates, because
    /// this runs on the render thread once per frame.
    fn render(&mut self) -> &[String] {
        self.lines.clear();
        if !self.open {
            return &self.lines;
        }
        for (index, item) in self.items.iter().enumerate() {
            let state_colour = if item.enabled {
                COLOUR_ENABLED
            } else {
                COLOUR_DISABLED
            };
            let marker = if index == self.cursor { '>' } else { ' ' };
            let colour = if index == self.cursor {
                COLOUR_SELECTED
            } else {
                state_colour
            };
            self.lines.push(format!(
                "{COLOUR_MARKER}{colour}{marker} {} [{}]",
                item.label,
                if item.enabled { "on" } else { "off" }
            ));
        }
        &self.lines
    }
}

fn main() {
    let mut menu = Menu::new(&["Radar", "Crosshair info", "Frame counter"]);
    let mut keys = EdgeDetector::new();
    menu.open = true;

    println!("1. Opened, cursor on the first row");
    for line in menu.render() {
        println!("   {}", line.replace(COLOUR_MARKER, "^"));
    }

    println!("\n2. Holding Down for three frames moves exactly one row");
    let held = KeyFrame {
        up: false,
        down: true,
        toggle: false,
    };
    for _ in 0..3 {
        let edges = keys.edges(held);
        menu.update(edges);
    }
    println!("   cursor is now {}", menu.cursor);

    println!("\n3. Releasing and pressing again moves another row");
    let _ = keys.edges(KeyFrame::default());
    menu.update(keys.edges(held));
    println!("   cursor is now {}", menu.cursor);

    println!("\n4. Toggling the selected row");
    let _ = keys.edges(KeyFrame::default());
    menu.update(keys.edges(KeyFrame {
        up: false,
        down: false,
        toggle: true,
    }));
    for line in menu.render() {
        println!("   {}", line.replace(COLOUR_MARKER, "^"));
    }

    println!(
        "   the worker would now ask: Radar enabled? {}",
        menu.is_enabled("Radar")
    );

    println!("\n5. Wrapping upward from the first row");
    menu.cursor = 0;
    menu.move_up();
    println!("   cursor wrapped to {}", menu.cursor);
}

#[cfg(test)]
mod tests {
    use super::{EdgeDetector, KeyFrame, Menu};

    fn press(down: bool, up: bool, toggle: bool) -> KeyFrame {
        KeyFrame { up, down, toggle }
    }

    #[test]
    fn the_cursor_wraps_in_both_directions() {
        let mut menu = Menu::new(&["a", "b", "c"]);
        menu.cursor = 0;
        menu.move_up();
        assert_eq!(menu.cursor, 2, "moving up from the first row wraps to last");
        menu.move_down();
        assert_eq!(
            menu.cursor, 0,
            "moving down from the last row wraps to first"
        );
    }

    #[test]
    fn a_held_key_moves_exactly_one_row() {
        let mut menu = Menu::new(&["a", "b", "c"]);
        let mut keys = EdgeDetector::new();
        menu.open = true;

        for _ in 0..10 {
            let edges = keys.edges(press(true, false, false));
            menu.update(edges);
        }
        assert_eq!(menu.cursor, 1, "holding Down must not scroll every frame");
    }

    #[test]
    fn releasing_and_pressing_again_moves_a_second_row() {
        let mut menu = Menu::new(&["a", "b", "c"]);
        let mut keys = EdgeDetector::new();
        menu.open = true;

        menu.update(keys.edges(press(true, false, false)));
        menu.update(keys.edges(KeyFrame::default()));
        menu.update(keys.edges(press(true, false, false)));
        assert_eq!(menu.cursor, 2);
    }

    #[test]
    fn a_closed_menu_ignores_input_and_draws_nothing() {
        let mut menu = Menu::new(&["a", "b"]);
        let mut keys = EdgeDetector::new();

        menu.update(keys.edges(press(true, false, true)));
        assert_eq!(menu.cursor, 0);
        assert!(!menu.is_enabled("a"));
        assert!(menu.render().is_empty());
    }

    #[test]
    fn toggling_changes_only_the_selected_row() {
        let mut menu = Menu::new(&["a", "b"]);
        let mut keys = EdgeDetector::new();
        menu.open = true;

        menu.update(keys.edges(press(false, false, true)));
        assert!(menu.is_enabled("a"));
        assert!(!menu.is_enabled("b"));
    }

    #[test]
    fn rendering_reuses_its_buffer() {
        let mut menu = Menu::new(&["a", "b", "c"]);
        menu.open = true;

        let first = menu.render().len();
        let capacity_after_first = menu.lines.capacity();
        let second = menu.render().len();

        assert_eq!(first, second);
        assert_eq!(
            capacity_after_first,
            menu.lines.capacity(),
            "the render path must not reallocate every frame"
        );
    }

    #[test]
    fn every_line_carries_a_colour_marker() {
        let mut menu = Menu::new(&["a", "b"]);
        menu.open = true;
        assert!(
            menu.render()
                .iter()
                .all(|line| line.starts_with(super::COLOUR_MARKER))
        );
    }
}
