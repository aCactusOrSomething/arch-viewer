import { load3dm } from "../loader/Loader";
import getPipeline from "./pipelines/Pipeline";
import shader from './shaders/shader.wgsl?raw'

export class Renderer {
    canvasRef: HTMLCanvasElement
    device: GPUDevice | undefined | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(canvasRef: HTMLCanvasElement) {
        this.canvasRef = canvasRef;
    }

    async init() {
        if (this.initPromise) return this.initPromise;
        this.initPromise = this._init();
        return this.initPromise;
    }

    private async _init() {
        if (this.device) return;
        // request our basic setup stuff
        const adapter = await navigator.gpu?.requestAdapter();
        this.device = await adapter?.requestDevice({ label: 'main-device' });
        const device = this.device;

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

        const meshJson = await load3dm() as any;

        const positions: Array<Float32Array<ArrayBuffer>> = [];
        const vertexBuffers: Array<GPUBuffer> = [];
        for (let i in meshJson) {
            let mesh = new Float32Array(meshJson[i].data.attributes.position.array);
            const vertexBuffer = device.createBuffer({
                size: mesh.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            positions.push(mesh);
            vertexBuffers.push(vertexBuffer);
            device.queue.writeBuffer(vertexBuffer, 0, mesh);
        }



        const pipeline = getPipeline(device, presentationFormat, module);

        function render(canvas: HTMLCanvasElement, device: GPUDevice) {
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
            for (let i in vertexBuffers) {
                const vertexBuffer = vertexBuffers[i];
                const position = positions[i];
                pass.setVertexBuffer(0, vertexBuffer);
                pass.draw(position.length / 3)  // call our vertex shader 

            }
            pass.end();
            const commandBuffer = encoder.finish();
            device!.queue.submit([commandBuffer]);
        }



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
            render(this.canvasRef, this.device!);
        });

        observer.observe(this.canvasRef);
    }

    destroy() {
        this.device?.destroy();
        this.device = null;
        this.initPromise = null;
    }
}