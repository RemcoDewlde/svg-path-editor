use wasm_bindgen::prelude::*;

// Command type codes (must match TS side)
pub const CMD_M: u8 = 0;
pub const CMD_L: u8 = 1;
pub const CMD_Z: u8 = 2;

// ── WASM exports (wasm32 only — js_sys types not available on native) ─────────

/// Parse an SVG path `d` string (M/L/Z only) into flat typed arrays.
///
/// Returns a JS array: [Uint8Array types, Float64Array coords, u32 count]
/// - types[i]  = CMD_M(0) | CMD_L(1) | CMD_Z(2)
/// - coords[i*2]   = x  (NaN for Z)
/// - coords[i*2+1] = y  (NaN for Z)
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn parse_path(d: &str) -> Result<js_sys::Array, JsValue> {
    let commands = parse_path_inner(d)
        .map_err(|e| JsValue::from_str(&e))?;

    let n = commands.len();
    let types = js_sys::Uint8Array::new_with_length(n as u32);
    let coords = js_sys::Float64Array::new_with_length((n * 2) as u32);

    for (i, cmd) in commands.iter().enumerate() {
        match cmd {
            Cmd::M(x, y) => {
                types.set_index(i as u32, CMD_M);
                coords.set_index((i * 2) as u32, *x);
                coords.set_index((i * 2 + 1) as u32, *y);
            }
            Cmd::L(x, y) => {
                types.set_index(i as u32, CMD_L);
                coords.set_index((i * 2) as u32, *x);
                coords.set_index((i * 2 + 1) as u32, *y);
            }
            Cmd::Z => {
                types.set_index(i as u32, CMD_Z);
                coords.set_index((i * 2) as u32, f64::NAN);
                coords.set_index((i * 2 + 1) as u32, f64::NAN);
            }
        }
    }

    let result = js_sys::Array::new_with_length(3);
    result.set(0, types.into());
    result.set(1, coords.into());
    result.set(2, JsValue::from_f64(n as f64));
    Ok(result)
}

/// Serialise flat typed arrays back to an SVG path `d` string.
///
/// - types: Uint8Array  (CMD_M=0, CMD_L=1, CMD_Z=2)
/// - coords: Float64Array  (x, y pairs; ignored for Z)
/// - n: number of commands
#[wasm_bindgen]
pub fn build_path(types: &[u8], coords: &[f64], n: usize) -> String {
    build_path_inner(types, coords, n)
}

// ── Pure Rust helpers (usable from native tests too) ─────────────────────────

pub(crate) fn build_path_inner(types: &[u8], coords: &[f64], n: usize) -> String {
    let mut parts: Vec<String> = Vec::with_capacity(n);
    for i in 0..n {
        match types[i] {
            CMD_Z => parts.push("Z".to_string()),
            CMD_M => {
                let x = coords[i * 2];
                let y = coords[i * 2 + 1];
                parts.push(format!("M {} {}", fmt_num(x), fmt_num(y)));
            }
            CMD_L => {
                let x = coords[i * 2];
                let y = coords[i * 2 + 1];
                parts.push(format!("L {} {}", fmt_num(x), fmt_num(y)));
            }
            _ => {}
        }
    }
    parts.join("\n")
}

pub(crate) enum Cmd {
    M(f64, f64),
    L(f64, f64),
    Z,
}

fn fmt_num(v: f64) -> String {
    // Match JS formatNumber: toFixed(2) then strip trailing zeros after decimal
    let s = format!("{:.2}", v);
    let s = s.trim_end_matches('0');
    let s = s.trim_end_matches('.');
    s.to_string()
}

pub(crate) fn parse_path_inner(d: &str) -> Result<Vec<Cmd>, String> {
    let mut tokens: Vec<&str> = Vec::new();
    let mut i = 0;
    let bytes = d.as_bytes();
    let len = bytes.len();

    while i < len {
        let b = bytes[i];
        if b == b' ' || b == b',' || b == b'\n' || b == b'\r' || b == b'\t' {
            i += 1;
            continue;
        }
        if b == b'M' || b == b'L' || b == b'Z' || b == b'm' || b == b'l' || b == b'z' {
            tokens.push(&d[i..i + 1]);
            i += 1;
            continue;
        }
        if b == b'-' || b == b'+' || b.is_ascii_digit() || b == b'.' {
            let start = i;
            if b == b'-' || b == b'+' { i += 1; }
            while i < len && bytes[i].is_ascii_digit() { i += 1; }
            if i < len && bytes[i] == b'.' {
                i += 1;
                while i < len && bytes[i].is_ascii_digit() { i += 1; }
            }
            if i < len && (bytes[i] == b'e' || bytes[i] == b'E') {
                i += 1;
                if i < len && (bytes[i] == b'-' || bytes[i] == b'+') { i += 1; }
                while i < len && bytes[i].is_ascii_digit() { i += 1; }
            }
            tokens.push(&d[start..i]);
            continue;
        }
        i += 1; // skip unknown char
    }

    let mut result = Vec::new();
    let mut ti = 0;
    let mut current_cmd: Option<u8> = None;

    while ti < tokens.len() {
        let tok = tokens[ti];
        if tok.len() == 1 {
            let c = tok.as_bytes()[0];
            if c == b'M' || c == b'm' || c == b'L' || c == b'l' || c == b'Z' || c == b'z' {
                current_cmd = Some(c.to_ascii_uppercase());
                ti += 1;
                if current_cmd == Some(b'Z') {
                    result.push(Cmd::Z);
                    current_cmd = None;
                }
                continue;
            }
        }

        match current_cmd {
            Some(b'M') | Some(b'L') => {
                if ti + 1 >= tokens.len() {
                    return Err(format!("Expected x y near token index {}", ti));
                }
                let x: f64 = tokens[ti].parse().map_err(|_| format!("Bad number: {}", tokens[ti]))?;
                let y: f64 = tokens[ti + 1].parse().map_err(|_| format!("Bad number: {}", tokens[ti + 1]))?;
                if current_cmd == Some(b'M') {
                    result.push(Cmd::M(x, y));
                    current_cmd = Some(b'L'); // implicit L after first M coords
                } else {
                    result.push(Cmd::L(x, y));
                }
                ti += 2;
            }
            _ => {
                return Err(format!("Unexpected token '{}' with no active command", tok));
            }
        }
    }

    Ok(result)
}

// ── Rust unit tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip(d: &str) -> String {
        let cmds = parse_path_inner(d).unwrap();
        let mut types = Vec::new();
        let mut coords = Vec::new();
        for cmd in &cmds {
            match cmd {
                Cmd::M(x, y) => { types.push(CMD_M); coords.push(*x); coords.push(*y); }
                Cmd::L(x, y) => { types.push(CMD_L); coords.push(*x); coords.push(*y); }
                Cmd::Z      => { types.push(CMD_Z); coords.push(f64::NAN); coords.push(f64::NAN); }
            }
        }
        build_path_inner(&types, &coords, cmds.len())
    }

    #[test]
    fn test_simple_triangle() {
        let d = "M 0 0 L 10 0 L 5 10 Z";
        let out = roundtrip(d);
        assert!(out.contains("M 0 0"), "got: {}", out);
        assert!(out.contains("L 10 0"), "got: {}", out);
        assert!(out.contains("Z"), "got: {}", out);
    }

    #[test]
    fn test_decimals() {
        let d = "M 1.5 2.75 L 3.123456 4.0";
        let out = roundtrip(d);
        assert!(out.contains("M 1.5 2.75"), "got: {}", out);
        assert!(out.contains("L 3.12 4"), "got: {}", out);
    }

    #[test]
    fn test_negative_coords() {
        let d = "M -10 -20 L 0 0 Z";
        let out = roundtrip(d);
        assert!(out.contains("M -10 -20"), "got: {}", out);
    }

    #[test]
    fn test_multipath() {
        let d = "M 0 0 L 1 1 Z M 10 10 L 20 20 Z";
        let cmds = parse_path_inner(d).unwrap();
        assert_eq!(cmds.len(), 6);
    }

    #[test]
    fn test_lowercase_commands() {
        let d = "m 0 0 l 5 5 z";
        let cmds = parse_path_inner(d).unwrap();
        assert_eq!(cmds.len(), 3);
    }
}
