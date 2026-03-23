import { DepthTexture } from "../Texture";

export default function getPipeline(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    module: GPUShaderModule,
    bindGroupLayouts: GPUBindGroupLayout[],
) {
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: bindGroupLayouts
    });

    const pipeline = device.createRenderPipeline({
        label: 'debug pipeline',
        layout: pipelineLayout,
        vertex: {
            entryPoint: 'vs',
            module: module,
            buffers: [{
                arrayStride: 4 * 8,
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x3'
                    },
                    {
                        shaderLocation: 1,
                        offset: 4 * 3,
                        format: 'float32x3'
                    },
                    {
                        shaderLocation: 2,
                        offset: 4 * 3 * 2,
                        format: 'float32x2'
                    },
                ],

            }]
        },
        fragment: {
            entryPoint: 'fs',
            module,
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'front',
        },
        depthStencil: {
            format: DepthTexture.DEPTH_FORMAT,
            depthWriteEnabled: true,
            depthCompare: "less",
        }
    });

    return pipeline;
}
