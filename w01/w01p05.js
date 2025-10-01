"use strict";

async function main() {
    const gpu = navigator.gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const canvas = document.getElementById('my-canvas');
    const context = canvas.getContext('webgpu');
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    // Create circle of triangles
    let positions = [vec2(0.0, 0.0)];
    let colors = [vec3(0.0, 0.0, 0.0)];

    const r = 0.75;
    const N = 100;

    for (let i = 0; i <= N; i++) {
        const angle = (i / N) * 2 * Math.PI;
        positions.push(vec2(r * Math.cos(angle), r * Math.sin(angle)));
        positions.push(vec2(0.0, 0.0));
        positions.push(vec2(r * Math.cos(angle), r * Math.sin(angle)));
        colors.push(vec3(1, 0.53, 0.02));
        colors.push(vec3(0.0, 0.0, 0.0));
        colors.push(vec3(1, 0.53, 0.02));
    }

    positions.pop();
    colors.pop();

    // Create position buffer
    const positionBuffer = device.createBuffer({
        size: flatten(positions).byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));
    const positionBufferLayout = {
        arrayStride: sizeof['vec2'],
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    };

    // Create color buffer
    const colorBuffer = device.createBuffer({
        size: flatten(colors).byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(colorBuffer, /*bufferOffset=*/0, flatten(colors));
    const colorBufferLayout = {
        arrayStride: sizeof['vec3'],
        attributes: [{
            format: 'float32x3',
            offset: 0,
            shaderLocation: 1, // Color, see fragment shader
        }],
    };

    // Uniform buffer for offset
    let bytelength = 1 * sizeof['vec4']; // Buffers are allocated in vec4 chunks
    let uniforms = new ArrayBuffer(bytelength);
    const uniformBuffer = device.createBuffer({
        size: uniforms.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Load WGSL
    const wgslfile = document.getElementById('wgsl').src;
    const wgslcode
        = await fetch(wgslfile, { cache: "reload" }).then(r => r.text());
    const wgsl = device.createShaderModule({
        code: wgslcode
    });

    // Create pipeline
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: wgsl,
            entryPoint: 'main_vs',
            buffers: [positionBufferLayout, colorBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },
        primitive: { topology: 'triangle-list', },
    });

    // Set bindgroup for uniform data
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }],
    });

    let ty = 0;
    let vy = 0.01;

    function render() {
        ty += vy;
        vy = Math.sign(1 - r - Math.abs(ty)) * vy;

        const offset = vec3(0, ty, 0);

        new Float32Array(uniforms, 0, 3).set([...offset]);
        device.queue.writeBuffer(uniformBuffer, 0, uniforms);

        // Create a render pass in a command buffer and submit it
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
            }],
        });

        pass.setBindGroup(0, bindGroup);

        // Insert render pass commands here
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, positionBuffer);
        pass.setVertexBuffer(1, colorBuffer);
        pass.draw(positions.length);

        pass.end();
        device.queue.submit([encoder.finish()]);

        requestAnimationFrame(render);
    }
    render();
}

window.onload = function () { main(); }