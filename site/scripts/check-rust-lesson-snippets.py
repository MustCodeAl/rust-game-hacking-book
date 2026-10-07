"""Compile the four Rust idiom lessons in an isolated library; never run examples."""
from pathlib import Path
import re
import subprocess
import tempfile

site = Path(__file__).resolve().parents[1]
parts = ["#![allow(dead_code, unused_variables)]"]
count = 0
for lesson in ("13", "14", "15", "16"):
    body = (site / f"src/content/docs/pages/1/{lesson}.mdx").read_text()
    items = []
    for index, block in enumerate(re.findall(r"```rust[^\n]*\n([\s\S]*?)\n```", body)):
        count += 1
        block = re.sub(r"fn main\(", f"fn example_main_{index}(", block)
        if block.lstrip().startswith("let "):
            block = f"fn example_values_{index}() {{\n{block}\n}}"
        items.append(block)
    parts.append(f"mod lesson_{lesson} {{\n" + "\n\n".join(items) + "\n}")

with tempfile.TemporaryDirectory(prefix="gha-rust-snippets-") as directory:
    root = Path(directory)
    (root / "src").mkdir()
    (root / "src/lib.rs").write_text("\n\n".join(parts) + "\n")
    (root / "Cargo.toml").write_text(
        '[package]\nname="gha-rust-snippet-check"\nversion="0.0.0"\nedition="2024"\n'
        '\n[dependencies]\nthiserror="=2.0.18"\nanyhow="=1.0.102"\n'
    )
    result = subprocess.run(["rtk", "cargo", "check"], cwd=root, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)
print(f"Compiled {count} Rust listings with their preceding definitions. No example programs ran.")
