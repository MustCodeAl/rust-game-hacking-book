use std::{
    sync::mpsc::{self, Receiver, Sender},
    thread,
};

use eframe::egui;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
enum OverlayMode {
    #[default]
    Off,
    TeamOnly,
    AllActors,
}

#[derive(Clone, Debug, PartialEq)]
struct Settings {
    overlay: OverlayMode,
    show_names: bool,
    show_distance: bool,
    field_of_view: f32,
    observation_only: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            overlay: OverlayMode::Off,
            show_names: true,
            show_distance: true,
            field_of_view: 75.0,
            observation_only: true,
        }
    }
}

#[derive(Debug)]
enum Command {
    Apply(Settings),
    RestoreDefaults,
    Shutdown,
}

struct MenuApp {
    settings: Settings,
    last_applied: Settings,
    commands: Sender<Command>,
    status: String,
}

impl MenuApp {
    fn new(commands: Sender<Command>) -> Self {
        Self {
            settings: Settings::default(),
            last_applied: Settings::default(),
            commands,
            status: "Ready — no target changes have been requested.".into(),
        }
    }

    fn apply_if_changed(&mut self) {
        if self.settings == self.last_applied {
            self.status = "Nothing changed.".into();
            return;
        }

        // 📬 The UI sends owned data. The worker never borrows widget state.
        match self.commands.send(Command::Apply(self.settings.clone())) {
            Ok(()) => {
                self.last_applied = self.settings.clone();
                self.status = "Settings sent to the tool worker.".into();
            }
            Err(_) => self.status = "Worker stopped; no settings were applied.".into(),
        }
    }
}

impl eframe::App for MenuApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ui, |ui| {
            ui.heading("Game Hacking Academy — lab menu");
            ui.label("A separate settings window for the offline target.");
            ui.separator();

            egui::ComboBox::from_label("Overlay mode")
                .selected_text(format!("{:?}", self.settings.overlay))
                .show_ui(ui, |ui| {
                    ui.selectable_value(&mut self.settings.overlay, OverlayMode::Off, "Off");
                    ui.selectable_value(
                        &mut self.settings.overlay,
                        OverlayMode::TeamOnly,
                        "Teammates only",
                    );
                    ui.selectable_value(
                        &mut self.settings.overlay,
                        OverlayMode::AllActors,
                        "All local actors",
                    );
                });

            ui.checkbox(&mut self.settings.show_names, "Show names");
            ui.checkbox(&mut self.settings.show_distance, "Show distance");
            ui.add(
                egui::Slider::new(&mut self.settings.field_of_view, 30.0..=140.0)
                    .text("Field of view"),
            );

            // 🔒 Observation-only is the safe default and stays visually clear.
            ui.checkbox(
                &mut self.settings.observation_only,
                "Observation only (no writes or synthetic input)",
            );

            ui.add_space(8.0);
            ui.horizontal(|ui| {
                if ui.button("Apply changes").clicked() {
                    self.apply_if_changed();
                }

                if ui.button("Restore defaults").clicked() {
                    self.settings = Settings::default();
                    let _ = self.commands.send(Command::RestoreDefaults);
                    self.last_applied = self.settings.clone();
                    self.status = "Defaults restored.".into();
                }
            });

            ui.separator();
            ui.label(&self.status);
            ui.small("Tip: the worker owns process handles; this window owns only settings.");
        });
    }

    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        // 🧹 Give the worker one explicit cleanup path before the sender drops.
        let _ = self.commands.send(Command::Shutdown);
    }
}

fn lab_worker(commands: Receiver<Command>) {
    while let Ok(command) = commands.recv() {
        match command {
            Command::Apply(settings) => {
                // 🧪 Replace this print with the book's verified local-lab
                // adapter. Keep every raw handle and memory write in that worker.
                println!("apply: {settings:?}");
            }
            Command::RestoreDefaults => println!("restore defaults"),
            Command::Shutdown => {
                // 🧹 Restore patches and release held input here, then exit.
                println!("worker shutdown");
                break;
            }
        }
    }
}

fn main() -> eframe::Result {
    let (command_tx, command_rx) = mpsc::channel();
    let worker = thread::spawn(move || lab_worker(command_rx));

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([620.0, 470.0])
            .with_min_inner_size([440.0, 360.0]),
        centered: true,
        ..Default::default()
    };

    let result = eframe::run_native(
        "GHA tool menu",
        options,
        Box::new(move |_creation| Ok(Box::new(MenuApp::new(command_tx)))),
    );

    // ✅ `on_exit` stops the worker; joining proves cleanup completed.
    let _ = worker.join();
    result
}
