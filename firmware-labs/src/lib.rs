#![no_std]

/// A lamp that toggles once per new button press, not once per held sample.
/// Inputs are logical pressed/released states, already debounced by the caller.
pub struct LampController {
    lamp_on: bool,
    was_pressed: bool,
}

impl LampController {
    /// The lamp and previous button state both start off at each new boot.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            lamp_on: false,
            was_pressed: false,
        }
    }

    /// Accept one sample and return the output the lamp should now use.
    pub fn sample(&mut self, pressed: bool) -> bool {
        // A rising edge is a change from released to pressed.
        if pressed && !self.was_pressed {
            self.lamp_on = !self.lamp_on;
        }
        self.was_pressed = pressed;
        self.lamp_on
    }
}

impl Default for LampController {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::LampController;

    #[test]
    fn holding_and_releasing_do_not_create_extra_toggles() {
        let mut lamp = LampController::new();
        let samples = [false, true, true, false, true, false];
        let expected = [false, true, true, true, false, false];

        for (pressed, wanted) in samples.into_iter().zip(expected) {
            assert_eq!(lamp.sample(pressed), wanted);
        }
    }

    #[test]
    fn a_new_controller_does_not_retain_the_last_boots_state() {
        let mut first_boot = LampController::new();
        assert!(first_boot.sample(true));

        let mut second_boot = LampController::new();
        assert!(!second_boot.sample(false));
        assert!(second_boot.sample(true));
    }
}
