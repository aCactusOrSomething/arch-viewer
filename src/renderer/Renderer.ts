import { load3dm } from "../loader/Loader";
import getPipeline from "./pipelines/Pipeline";
import type { Vertex } from "./Vertex";
import shader from './shaders/shader.wgsl?raw'

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

        const module = device.createShaderModule({
        label: 'debug shaders',
        code: shader,
    });

        const pipeline = getPipeline(device, presentationFormat, module);

        const vertices: Array<Vertex> = [
            { position: new Float32Array([0.0, 0.5, 0.0]), color: new Float32Array([1.0, 0.0, 0.0]) },
            { position: new Float32Array([-0.5, -0.5, 0.0]), color: new Float32Array([0.0, 1.0, 0.0]) },
            { position: new Float32Array([0.5, -0.5, 0.0]), color: new Float32Array([0.0, 0.0, 1.0]) },
        ]

        let vertex_buffer = device.createBuffer(
            {
                label: "Vertex Buffer",
                size: 0,
                usage: GPUBufferUsage.VERTEX
            }
        )

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