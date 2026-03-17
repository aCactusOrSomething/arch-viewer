export default function getPipeline(device: GPUDevice, presentationFormat: GPUTextureFormat, module: GPUShaderModule) {

    const pipeline = device.createRenderPipeline({
        label: 'debug pipeline',
        layout: 'auto',
        vertex: {
            entryPoint: 'vs',
            module,
        },
        fragment: {
            entryPoint: 'fs',
            module,
            targets: [{ format: presentationFormat }],
        },
    });

    return pipeline;
}
