# Reading audio

`soft-music.mp3`, `quiet-rain.mp3`, `night-keys.mp3`, and `warm-hum.mp3` are original synthesized sounds made for
Game Hacking Academy. No recordings, samples, or third-party melodies are used.
The optional button, answer, and completion sounds are also synthesized by this site's own code.

To the extent possible under law, the contributors to Game Hacking Academy
waive all copyright and related rights to these four audio works under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

All four background tracks last 32 seconds and loop. They are mono MP3 files at
24 kb/s. Recreate them with `scripts/make-reading-audio.py` and ffmpeg.
Background audio and button sounds start off on every page. Only the volume
preference is saved. No sound file is requested until Play is pressed.
