struct Uniforms {
    mvp: mat4x4f,
    mtex: mat4x4f,
}

const pi = radians(180.0);

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var cubeMap: texture_cube<f32>;

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec4f,
}

@vertex
fn main_vs(@location(0) inPos: vec4f, @builtin(instance_index) instance: u32) -> VSOut {
    var vsOut: VSOut;
    vsOut.position = uniforms.mvp * inPos;
    vsOut.texCoord = uniforms.mtex * inPos;
    return vsOut;
}

@fragment
fn main_fs(@location(0) texCoord: vec4f) -> @location(0) vec4f {
    let coord = normalize(texCoord.xyz);
    let texColor = textureSample(cubeMap, mySampler, coord);
    return texColor;
}
