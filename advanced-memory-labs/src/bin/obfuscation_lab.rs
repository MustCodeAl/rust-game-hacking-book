use gha_advanced_memory_labs::obfuscation::ObfuscatedStat;

fn main() {
    let key = 0xA1B2_C3D4;
    let mut health = ObfuscatedStat::new(125, key);

    println!("stored bytes look like 0x{:08X}", health.encoded());
    println!("decoded health: {}", health.read(key).expect("valid tag"));

    health.flip_encoded_bit(3); // 🧪 Simulate one corrupted bit in a capture.
    println!("after corruption: {:?}", health.read(key));
}
