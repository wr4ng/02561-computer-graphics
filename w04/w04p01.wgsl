struct Uniforms {
    mvp: array<mat4x4f, 1>,
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
    vsOut.position = uniforms.mvp[instance] * inPos;
    vsOut.color = vec4(0.0, 0.0, 1.0, 1.0);
    return vsOut;
}

@fragment
fn main_fs(@location(0) inColor: vec4f) -> @location(0) vec4f {
    return inColor;
}