use gha_advanced_memory_labs::crypto::{open, seal};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 🔑 A real application loads this from protected key storage.
    // The fixed value is used only so this tiny demo stays repeatable.
    let demonstration_key = [0x42_u8; 32];
    let context = b"save-slot:3|format:1";
    let save = b"health=75;gold=12";

    let envelope = seal(&demonstration_key, save, context)?;
    let recovered = open(&demonstration_key, &envelope, context)?;

    println!("sealed {} bytes into {} bytes", save.len(), envelope.len());
    println!("opened: {}", String::from_utf8_lossy(&recovered));
    Ok(())
}
