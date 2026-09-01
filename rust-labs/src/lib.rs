#![doc = "Portable, safe Rust exercises used by Game Hacking Academy."]

use std::{error::Error, fmt};

/// One position in a byte pattern.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PatternByte {
    /// Match this byte exactly.
    Exact(u8),
    /// Match any one byte.
    Any,
}

/// Returns every offset at which `pattern` matches `bytes`.
#[must_use]
pub fn find_pattern(bytes: &[u8], pattern: &[PatternByte]) -> Vec<usize> {
    if pattern.is_empty() || pattern.len() > bytes.len() {
        return Vec::new();
    }

    bytes
        .windows(pattern.len())
        .enumerate()
        .filter_map(|(offset, window)| {
            window
                .iter()
                .zip(pattern)
                .all(|(found, expected)| match expected {
                    PatternByte::Exact(wanted) => found == wanted,
                    PatternByte::Any => true,
                })
                .then_some(offset)
        })
        .collect()
}

/// Errors produced by the small binary cursor.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ParseError {
    /// The input ended before the requested value.
    Truncated,
    /// A length field exceeded the caller's limit.
    TooLarge(usize),
    /// A byte sequence was not UTF-8.
    InvalidUtf8,
}

impl fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Truncated => formatter.write_str("the input ended before the requested value"),
            Self::TooLarge(length) => write!(
                formatter,
                "the declared payload length ({length} bytes) exceeds the configured limit"
            ),
            Self::InvalidUtf8 => formatter.write_str("the payload is not valid UTF-8"),
        }
    }
}

impl Error for ParseError {}

/// A bounds-checked reader over a borrowed byte slice.
#[derive(Debug)]
pub struct Cursor<'a> {
    bytes: &'a [u8],
    position: usize,
}

impl<'a> Cursor<'a> {
    /// Starts reading at the beginning of `bytes`.
    #[must_use]
    pub const fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, position: 0 }
    }

    /// Returns the current byte offset.
    #[must_use]
    pub const fn position(&self) -> usize {
        self.position
    }

    /// Takes exactly `count` bytes.
    ///
    /// # Errors
    ///
    /// Returns [`ParseError::Truncated`] when the requested range overflows or
    /// extends beyond the input.
    pub fn take(&mut self, count: usize) -> Result<&'a [u8], ParseError> {
        let end = self
            .position
            .checked_add(count)
            .ok_or(ParseError::Truncated)?;
        let output = self
            .bytes
            .get(self.position..end)
            .ok_or(ParseError::Truncated)?;
        self.position = end;
        Ok(output)
    }

    /// Reads an unsigned big-endian 32-bit integer.
    ///
    /// # Errors
    ///
    /// Returns [`ParseError::Truncated`] when fewer than four bytes remain.
    pub fn u32_be(&mut self) -> Result<u32, ParseError> {
        let bytes: [u8; 4] = self
            .take(4)?
            .try_into()
            .map_err(|_| ParseError::Truncated)?;
        Ok(u32::from_be_bytes(bytes))
    }

    /// Reads a big-endian-length-prefixed UTF-8 string.
    ///
    /// # Errors
    ///
    /// Returns [`ParseError::Truncated`] for incomplete data,
    /// [`ParseError::TooLarge`] when the length exceeds `maximum`, or
    /// [`ParseError::InvalidUtf8`] when the payload is not valid UTF-8.
    pub fn string(&mut self, maximum: usize) -> Result<String, ParseError> {
        let length =
            usize::try_from(self.u32_be()?).map_err(|_| ParseError::TooLarge(usize::MAX))?;
        if length > maximum {
            return Err(ParseError::TooLarge(length));
        }
        std::str::from_utf8(self.take(length)?)
            .map(str::to_owned)
            .map_err(|_| ParseError::InvalidUtf8)
    }
}

/// A point or direction in three dimensions.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    /// Subtracts another vector.
    #[must_use]
    pub fn subtract(self, other: Self) -> Self {
        Self {
            x: self.x - other.x,
            y: self.y - other.y,
            z: self.z - other.z,
        }
    }

    /// Rejects non-finite or implausibly large coordinates.
    #[must_use]
    pub fn is_reasonable(self) -> bool {
        [self.x, self.y, self.z]
            .into_iter()
            .all(|value| value.is_finite() && value.abs() < 1_000_000.0)
    }
}

/// Horizontal and vertical camera angles in degrees.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Angles {
    pub yaw: f32,
    pub pitch: f32,
}

/// Calculates the angles from `camera` to `target`.
#[must_use]
pub fn angles_to(camera: Vec3, target: Vec3) -> Option<Angles> {
    if !camera.is_reasonable() || !target.is_reasonable() {
        return None;
    }

    let delta = target.subtract(camera);
    let horizontal = delta.x.hypot(delta.y);
    if horizontal < f32::EPSILON && delta.z.abs() < f32::EPSILON {
        return None;
    }

    Some(Angles {
        yaw: delta.y.atan2(delta.x).to_degrees(),
        pitch: delta.z.atan2(horizontal).to_degrees(),
    })
}

/// Finds the signed shortest turn from one angle to another.
#[must_use]
pub fn shortest_angle_delta(current: f32, desired: f32) -> f32 {
    (desired - current + 180.0).rem_euclid(360.0) - 180.0
}

/// A row-major 4×4 matrix.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Mat4 {
    pub values: [[f32; 4]; 4],
}

/// Normalized depth interval used by the target graphics API.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DepthConvention {
    /// OpenGL-style normalized depth from -1 through 1.
    OpenGl,
    /// Direct3D-style normalized depth from 0 through 1.
    Direct3D,
}

impl DepthConvention {
    /// Returns whether a finite normalized depth lies inside the clip volume.
    #[must_use]
    pub fn contains(self, depth: f32) -> bool {
        depth.is_finite()
            && match self {
                Self::OpenGl => (-1.0..=1.0).contains(&depth),
                Self::Direct3D => (0.0..=1.0).contains(&depth),
            }
    }
}

/// A projected screen position.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ScreenPoint {
    pub x: f32,
    pub y: f32,
    pub depth: f32,
}

/// Projects a 3D point with a row-major view-projection matrix.
///
/// The matrix contract assumes visible points produce positive clip `w`.
/// Callers must supply the normalized depth interval used by the target API.
#[must_use]
pub fn world_to_screen(
    point: Vec3,
    matrix: Mat4,
    width: f32,
    height: f32,
    depth_convention: DepthConvention,
) -> Option<ScreenPoint> {
    if !point.is_reasonable()
        || !width.is_finite()
        || !height.is_finite()
        || width <= 0.0
        || height <= 0.0
    {
        return None;
    }

    let m = matrix.values;
    let clip_x = point.x * m[0][0] + point.y * m[0][1] + point.z * m[0][2] + m[0][3];
    let clip_y = point.x * m[1][0] + point.y * m[1][1] + point.z * m[1][2] + m[1][3];
    let clip_z = point.x * m[2][0] + point.y * m[2][1] + point.z * m[2][2] + m[2][3];
    let clip_w = point.x * m[3][0] + point.y * m[3][1] + point.z * m[3][2] + m[3][3];

    if !clip_w.is_finite() || clip_w <= 0.001 {
        return None;
    }

    let ndc_x = clip_x / clip_w;
    let ndc_y = clip_y / clip_w;
    let ndc_z = clip_z / clip_w;
    if !ndc_x.is_finite() || !ndc_y.is_finite() || !depth_convention.contains(ndc_z) {
        return None;
    }

    Some(ScreenPoint {
        x: ndc_x.midpoint(1.0) * width,
        y: (-ndc_y).midpoint(1.0) * height,
        depth: ndc_z,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pattern_matches_exact_and_wildcard_bytes() {
        let bytes = [0x10, 0x20, 0x30, 0x20, 0xFF];
        let pattern = [PatternByte::Exact(0x20), PatternByte::Any];
        assert_eq!(find_pattern(&bytes, &pattern), vec![1, 3]);
    }

    #[test]
    fn pattern_can_start_at_the_last_possible_offset() {
        let bytes = [0x10, 0x20, 0x30];
        let pattern = [PatternByte::Exact(0x20), PatternByte::Exact(0x30)];
        assert_eq!(find_pattern(&bytes, &pattern), vec![1]);
    }

    #[test]
    fn cursor_reads_bounded_text() {
        let bytes = [0, 0, 0, 3, b'r', b'u', b's', b't'];
        let mut cursor = Cursor::new(&bytes);
        assert_eq!(cursor.string(8), Ok(String::from("rus")));
        assert_eq!(cursor.position(), 7);
    }

    #[test]
    fn cursor_rejects_an_oversized_field() {
        let bytes = [0, 0, 4, 0];
        let mut cursor = Cursor::new(&bytes);
        assert_eq!(cursor.string(32), Err(ParseError::TooLarge(1_024)));
    }

    #[test]
    fn cursor_error_explains_the_failed_boundary() {
        let error = ParseError::TooLarge(1_024);
        assert_eq!(
            error.to_string(),
            "the declared payload length (1024 bytes) exceeds the configured limit"
        );
    }

    #[test]
    fn angle_wrap_uses_the_shortest_turn() {
        assert!((shortest_angle_delta(179.0, -179.0) - 2.0).abs() < 0.001);
    }

    #[test]
    fn angle_to_point_on_positive_y_is_ninety_degrees() {
        let origin = Vec3 {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        };
        let target = Vec3 {
            x: 0.0,
            y: 10.0,
            z: 0.0,
        };
        let angles = angles_to(origin, target).expect("different points");
        assert!((angles.yaw - 90.0).abs() < 0.001);
        assert!(angles.pitch.abs() < 0.001);
    }

    #[test]
    fn identity_projection_maps_origin_to_screen_center() {
        let identity = Mat4 {
            values: [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        };
        let point = world_to_screen(
            Vec3 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
            identity,
            1920.0,
            1080.0,
            DepthConvention::OpenGl,
        )
        .expect("origin projects");
        assert!((point.x - 960.0).abs() < f32::EPSILON);
        assert!((point.y - 540.0).abs() < f32::EPSILON);
    }

    #[test]
    fn depth_conventions_reject_different_clip_ranges() {
        assert!(DepthConvention::OpenGl.contains(-0.5));
        assert!(!DepthConvention::Direct3D.contains(-0.5));
        assert!(DepthConvention::Direct3D.contains(0.5));
        assert!(!DepthConvention::OpenGl.contains(f32::NAN));
    }
}
