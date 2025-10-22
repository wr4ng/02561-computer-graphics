struct Uniforms {
    mvp: array<mat4x4f, 1>,
}

const pi = radians(180.0);

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) inPos: vec4f,
}

@vertex
fn main_vs(@location(0) inPos: vec4f, @builtin(instance_index) instance: u32) -> VSOut {
    var vsOut: VSOut;
    vsOut.position = uniforms.mvp[instance] * inPos;
    vsOut.inPos = inPos;
    return vsOut;
}

@fragment
fn main_fs(@location(0) inPos: vec4f) -> @location(0) vec4f {
    let u = 1/2 - atan2(inPos.z, inPos.x) / (2 * pi);
    let v = 1/2 + acos(inPos.y) / pi;
    let texColor = textureSample(myTexture, mySampler, vec2f(u, v));

    let n = normalize(inPos.xyz);

    const l_e = vec3f(0, 0, - 1);
    const omega_i = - l_e;
    const L_e = vec3f(1, 1, 1);

    let L_d = texColor.xyz * L_e * max(dot(n, omega_i), 0.0);
    return vec4f(L_d, 1.0);
}