export class Renderer {
    canvasRef: HTMLCanvasElement

    constructor(canvasRef: HTMLCanvasElement) {
        this.canvasRef = canvasRef;
    }

    async init() {
        // request our basic setup stuff
        const adapter = await navigator.gpu?.requestAdapter();
        const device = await adapter?.requestDevice();
        if (!device) {
            throw new Error("This browser does not support webGPU, and a webGL fallback isn't implemented.")
        }

        // get webGPU context from canvas & configure it
        const context = this.canvasRef.getContext('webgpu');
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context?.configure({
            device,
            format: presentationFormat,
        });

        const module = device.createShaderModule({
            label: 'debug shaders',
            code: /* wgsl */ `
                @vertex fn vs(
                    @builtin(vertex_index) vertexIndex: u32
                ) -> @builtin(position) vec4f {
                    let pos = array(
                        vec2f( 0.0,  0.5),
                        vec2f(-0.5, -0.5),
                        vec2f( 0.5, -0.5)
                    );
                    return vec4f(pos[vertexIndex], 0.0, 1.0);
                }

                @fragment fn fs() -> @location(0) vec4f {
                    return vec4f(1.0, 0.0, 0.0, 1.0);
                }
            `,
        });

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

        const renderPassDescriptor: GPURenderPassDescriptor = {
            label: 'basic debug render pass',
            colorAttachments: [
                {
                    view: context!.getCurrentTexture().createView(),
                    clearValue: [0.3, 0.3, 0.3, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        }

        function render() {
            // Get the current texture from the canvas context and
            // set it as the texture to render to.
            for (const attachment of renderPassDescriptor.colorAttachments) {
                attachment!.view = context!.getCurrentTexture().createView();
            }
           

            // make a command encoder to start encoding commands
            const encoder = device!.createCommandEncoder({ label: 'our encoder' });

            // make a render pass encoder to encode render specific commands
            const pass = encoder.beginRenderPass(renderPassDescriptor);
            pass.setPipeline(pipeline);
            pass.draw(3);  // call our vertex shader 3 times
            pass.end();

            const commandBuffer = encoder.finish();
            device!.queue.submit([commandBuffer]);
        }

        render();
    }

    destroy() {
        throw new Error("Method not implemented.");
    }
}