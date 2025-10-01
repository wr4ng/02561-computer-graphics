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

    const point_size = 10 * (2 / canvas.height);
    const verts_per_point = 6;
    const colorValues = [
        vec4(1.0, 1.0, 1.0, 1.0), // White
        vec4(0.0, 0.0, 0.0, 1.0), // Black
        vec4(1.0, 0.0, 0.0, 1.0), // Red
        vec4(0.0, 1.0, 0.0, 1.0), // Green
        vec4(0.0, 0.0, 1.0, 1.0), // Blue
        vec4(1.0, 1.0, 0.0, 1.0), // Yellow
        vec4(1.0, 0.647, 0.0, 1.0), // Orange
        vec4(0.3921, 0.5843, 0.9294, 1.0) // Cornflower
    ];

    let index = 0;

    // Triangle mode
    let numPoints = 0;
    let trianglePositions = [];
    let triangleColors = [];

    function resetTriangleMode() {
        numPoints = 0;
        trianglePositions = [];
        triangleColors = [];
    }

    const modeSelect = document.getElementById("mode-select");
    // Reset mode variables on mode change
    modeSelect.onchange = () => resetTriangleMode();

    const colorSelect = document.getElementById("color-select");

    // Create event listener
    canvas.addEventListener("click", function (ev) {
        // Get mouse position
        var rect = ev.target.getBoundingClientRect();
        const mousepos = vec2(2 * (ev.clientX - rect.left) / canvas.width - 1, 2 * (canvas.height - ev.clientY + rect.top - 1) / canvas.height - 1);

        let positions = [];
        let colors = [];

        // Point mode
        if (modeSelect.value == 0) {
            add_point(positions, mousepos, point_size);
            colors.push(...Array(verts_per_point).fill(colorValues[colorSelect.value]));

            device.queue.writeBuffer(positionBuffer, index * sizeof['vec2'], flatten(positions));
            device.queue.writeBuffer(colorBuffer, index * sizeof['vec4'], flatten(colors));
            index += verts_per_point;
        }
        // Triangle mode
        else if (modeSelect.value == 1) {
            trianglePositions.push(mousepos);
            triangleColors.push(colorValues[colorSelect.value]);
            numPoints++;
            if (numPoints == 3) {
                positions.push(...trianglePositions);
                colors.push(...triangleColors);

                index -= 2 * verts_per_point;
                device.queue.writeBuffer(positionBuffer, index * sizeof['vec2'], flatten(positions));
                device.queue.writeBuffer(colorBuffer, index * sizeof['vec4'], flatten(colors));
                index += 3;
                
                resetTriangleMode();
            }
            else {
                add_point(positions, mousepos, point_size);
                colors.push(...Array(verts_per_point).fill(colorValues[colorSelect.value]));

                device.queue.writeBuffer(positionBuffer, index * sizeof['vec2'], flatten(positions));
                device.queue.writeBuffer(colorBuffer, index * sizeof['vec4'], flatten(colors));
                index += verts_per_point;
            }
        }
        requestAnimationFrame(render);
    });

    // Clear button and canvas color selector
    const clearSelect = document.getElementById("clear-select");
    let bgcolor = colorValues[clearSelect.value];

    // Clear canvas
    document.getElementById("clear-button").onclick = function () {
        index = 0;
        bgcolor = colorValues[clearSelect.value];
        // Reset triangle variables
        resetTriangleMode();
        requestAnimationFrame(render);
    };

    // Create position buffer
    const max_points = 5000;
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

    // Create color buffer
    const colorBuffer = device.createBuffer({
        size: sizeof['vec4'] * verts_per_point * max_points,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const colorBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 1, // Color, see vertex shader
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
            buffers: [positionBufferLayout, colorBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },
        primitive: { topology: 'triangle-list', },
    });


    function render() {
        // Create a render pass in a command buffer and submit it
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: bgcolor[0], g: bgcolor[1], b: bgcolor[2], a: bgcolor[3] },
            }],
        });

        // Insert render pass commands here
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, positionBuffer);
        pass.setVertexBuffer(1, colorBuffer);
        pass.draw(index);

        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    // Initial render
    render();
}

window.onload = function () { main(); }