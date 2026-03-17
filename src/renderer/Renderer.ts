import { load3dm } from "../loader/Loader";

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
                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) color: vec4f,
                };

                @vertex fn vs(
                    @builtin(vertex_index) vertexIndex: u32
                ) -> VertexOutput {
                    let pos = array(
                        vec2f( 0.0,  0.5),
                        vec2f(-0.5, -0.5),
                        vec2f( 0.5, -0.5),
                    );
                    var color = array<vec4f, 3>(
                        vec4f(1, 0, 0, 1),
                        vec4f(0, 1, 0, 1),
                        vec4f(0, 0, 1, 1),
                    );

                    var output: VertexOutput;
                    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
                    output.color = color[vertexIndex];
                    return output;
                }

                @fragment fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
                    return fsInput.color;
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
        
        load3dm();

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const canvas = entry.target;
                if (canvas instanceof HTMLCanvasElement) {
                    const width = entry.contentBoxSize[0].inlineSize;
                    const height = entry.contentBoxSize[0].blockSize;

                    canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
                    canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
                }
            }
            render();
        });

        observer.observe(this.canvasRef);
    }

    destroy() {
        throw new Error("Method not implemented.");
    }
}