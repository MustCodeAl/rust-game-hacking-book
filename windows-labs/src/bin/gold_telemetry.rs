#[cfg(windows)]
mod app {
    use std::{
        fs::File,
        io::{self, BufWriter, Write},
        path::PathBuf,
        sync::mpsc::{self, SyncSender, TrySendError},
        thread::{self, JoinHandle},
        time::{Duration, Instant},
    };

    use anyhow::Context;
    use gha_windows_labs::Process;

    const PLAYER_ROOT: usize = 0x017E_ED18;
    const GAME_OFFSET: usize = 0x0A90;
    const GOLD_OFFSET: usize = 0x0004;
    const QUEUE_CAPACITY: usize = 128;

    #[derive(Clone, Copy, Debug)]
    struct GoldEvent {
        elapsed_ms: u128,
        value: u32,
    }

    struct TelemetrySink {
        sender: Option<SyncSender<GoldEvent>>,
        writer: Option<JoinHandle<io::Result<usize>>>,
        dropped: usize,
    }

    impl TelemetrySink {
        fn start(path: PathBuf, target: String) -> anyhow::Result<Self> {
            let file = File::create(&path)
                .with_context(|| format!("could not create {}", path.display()))?;
            let (sender, receiver) = mpsc::sync_channel::<GoldEvent>(QUEUE_CAPACITY);
            let writer = thread::Builder::new()
                .name("gha-telemetry-writer".to_owned())
                .spawn(move || {
                    let mut output = BufWriter::new(file);
                    writeln!(output, "# gha-gold-telemetry v1")?;
                    writeln!(output, "# target={target}")?;
                    writeln!(output, "elapsed_ms,gold")?;
                    let mut written = 0_usize;
                    while let Ok(event) = receiver.recv() {
                        writeln!(output, "{},{}", event.elapsed_ms, event.value)?;
                        written += 1;
                    }
                    output.flush()?;
                    Ok(written)
                })?;

            Ok(Self {
                sender: Some(sender),
                writer: Some(writer),
                dropped: 0,
            })
        }

        fn record(&mut self, event: GoldEvent) -> anyhow::Result<()> {
            let sender = self.sender.as_ref().context("telemetry sink is closed")?;
            match sender.try_send(event) {
                Ok(()) => Ok(()),
                // ⚠️ Never block the observation loop behind slow disk I/O.
                Err(TrySendError::Full(_)) => {
                    self.dropped += 1;
                    Ok(())
                }
                Err(TrySendError::Disconnected(_)) => {
                    anyhow::bail!("telemetry writer stopped early")
                }
            }
        }

        fn finish(mut self) -> anyhow::Result<(usize, usize)> {
            // 🧹 Closing the final sender lets the writer drain queued events,
            // flush the file, and leave its receive loop without a magic sentinel.
            self.sender.take();
            let writer = self.writer.take().context("telemetry writer is missing")?;
            let written = writer
                .join()
                .map_err(|_| anyhow::anyhow!("telemetry writer panicked"))??;
            Ok((written, self.dropped))
        }
    }

    impl Drop for TelemetrySink {
        fn drop(&mut self) {
            self.sender.take();
            if let Some(writer) = self.writer.take() {
                let _ = writer.join();
            }
        }
    }

    fn gold_address(process: &Process) -> anyhow::Result<usize> {
        let player = process.read_u32(PLAYER_ROOT)? as usize;
        anyhow::ensure!(player != 0, "start a local Wesnoth match first");
        let side_pointer = player
            .checked_add(GAME_OFFSET)
            .context("player + game offset overflowed")?;
        let side = process.read_u32(side_pointer)? as usize;
        anyhow::ensure!(side != 0, "current side pointer is null");
        side.checked_add(GOLD_OFFSET)
            .context("side + gold offset overflowed")
    }

    pub fn run() -> anyhow::Result<()> {
        let mut arguments = std::env::args().skip(1);
        let seconds = arguments
            .next()
            .map(|text| text.parse::<u64>())
            .transpose()
            .context("duration must be whole seconds")?
            .unwrap_or(10);
        anyhow::ensure!(
            (1..=300).contains(&seconds),
            "duration must be 1..=300 seconds"
        );
        let path = arguments
            .next()
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("wesnoth-gold.csv"));
        anyhow::ensure!(
            arguments.next().is_none(),
            "usage: gold_telemetry [seconds] [output.csv]"
        );

        // 🔒 Telemetry observes only; the process handle has no write rights.
        let process = Process::open_by_name("wesnoth.exe", false)?;
        anyhow::ensure!(
            process.is_32_bit()?,
            "this profile requires 32-bit Wesnoth 1.14.9"
        );
        let address = gold_address(&process)?;
        let target = format!(
            "{} pid={} address={address:#010x}",
            process.name(),
            process.id()
        );
        let mut sink = TelemetrySink::start(path.clone(), target)?;

        let started = Instant::now();
        let duration = Duration::from_secs(seconds);
        while started.elapsed() < duration {
            let value = process.read_u32(address)?;
            sink.record(GoldEvent {
                elapsed_ms: started.elapsed().as_millis(),
                value,
            })?;
            thread::sleep(Duration::from_millis(50));
        }

        let (written, dropped) = sink.finish()?;
        println!(
            "Wrote {written} samples to {} ({dropped} dropped).",
            path.display()
        );
        Ok(())
    }
}

#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    app::run()
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This live telemetry recorder must run on Windows.");
}
