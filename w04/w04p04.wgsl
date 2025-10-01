struct Uniforms {
    eye: vec3f,
    L_e: f32,
    L_a: f32,
    k_d: f32,
    k_s: f32,
    s: f32,
    mvp: mat4x4f,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
}

@vertex
fn main_vs(@location(0) inPos: vec4f, @builtin(instance_index) instance: u32) -> VSOut {
    var vsOut: VSOut;
    vsOut.position = uniforms.mvp * inPos;

    // Since we have a unit sphere, the normal is just the position (normalize just in case)
    let n = normalize(inPos.xyz);

    // Fixed diffuse and specular color
    let k_d = vec3f(1, 0, 0) * uniforms.k_d;
    let k_a = k_d;
    let k_s = vec3f(1, 1, 1) * uniforms.k_s;

    // Light direction
    const l_e = vec3f(0, 0, - 1);
    const omega_i = - l_e;
    let L_e = vec3f(1, 1, 1) * uniforms.L_e;
    let L_i = L_e;
    let L_a = vec3f(1, 1, 1) * uniforms.L_a;

    // Phong reflection model
    let w_o = normalize(uniforms.eye - inPos.xyz);
    let w_r = 2 * dot(omega_i, n) * n - omega_i;

    let L_P_rs = k_s * L_i * pow(max(dot(w_r, w_o), 0.0), uniforms.s);

    let L_rd = k_d * L_e * max(dot(n, omega_i), 0.0);
    let L_ra = k_a * L_a;

    let L_o = L_rd + L_ra + L_P_rs;

    vsOut.color = vec4f(L_o, 1.0);
    return vsOut;
}

@fragment
fn main_fs(@location(0) inColor: vec4f) -> @location(0) vec4f {
    return inColor;
}