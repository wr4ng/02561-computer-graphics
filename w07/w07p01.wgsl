struct Uniforms {
    mvp: array<mat4x4f, 1>,
}

const pi = radians(180.0);

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var cubeMap: texture_cube<f32>;

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
    let normal = normalize(inPos.xyz);
    let texColor = textureSample(cubeMap, mySampler, normal);
    return texColor;
}
