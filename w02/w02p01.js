"use strict";

function add_point(array, point, size) {
    const offset = size / 2;
    var point_coords = [vec2(point[0] - offset, point[1] - offset), vec2(point[0] + offset, point[1] - offset),
    vec2(point[0] - offset, point[1] + offset), vec2(point[0] - offset, point[1] + offset),
    vec2(point[0] + offset, point[1] - offset), vec2(point[0] + offset, point[1] + offset)];
    array.push.apply(array, point_coords);
}

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

    const point_size = 20 * (2 / canvas.height);
    const verts_per_point = 6;

    let index = 0;
    let positions = [];

    // Create event listener
    canvas.addEventListener("click", function (ev) {
        var rect = ev.target.getBoundingClientRect();
        const mousepos = vec2(2 * (ev.clientX - rect.left) / canvas.width - 1, 2 * (canvas.height - ev.clientY + rect.top - 1) / canvas.height - 1);
        add_point(positions, mousepos, point_size);
        index += verts_per_point;
        requestAnimationFrame(render);
    });

    // Create position buffer
    const max_points = 100;
    const positionBuffer = device.createBuffer({
        size: sizeof['vec2'] * verts_per_point * max_points,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const positionBufferLayout = {
        arrayStride: sizeof['vec2'],
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        }],
    };

    // Load WGSL code
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
            buffers: [positionBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },
        primitive: { topology: 'triangle-list', },
    });


    function render() {
        // Write position buffer
        device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));

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

        // Insert render pass commands here
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, positionBuffer);
        pass.draw(index);

        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    // Initial render
    render();
}

window.onload = function () { main(); }