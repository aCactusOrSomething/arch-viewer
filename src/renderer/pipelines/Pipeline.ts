export default function getPipeline(device: GPUDevice, presentationFormat: GPUTextureFormat, module: GPUShaderModule) {

    const pipeline = device.createRenderPipeline({
        label: 'debug pipeline',
        layout: 'auto',
        vertex: {
            entryPoint: 'vs',
            module: module,
            buffers: [{
                arrayStride: 12,
                attributes: [{
                    shaderLocation: 0,
                    offset: 0,
                    format: 'float32x3'
                }],

            }]
        },
        fragment: {
            entryPoint: 'fs',
            module,
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'point-list',
            cullMode: 'none',
        }
    });

    return pipeline;
}
