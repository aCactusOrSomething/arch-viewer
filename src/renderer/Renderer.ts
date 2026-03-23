import { load3dm } from "../loader/Loader";
import { Camera, CameraUniform } from "./Camera";
import getPipeline from "./pipelines/Pipeline";
import shader from './shaders/shader.wgsl?raw'
import { DepthTexture } from "./Texture";

export class Renderer {
    canvasRef: HTMLCanvasElement
    device: GPUDevice | undefined | null = null;
    private initPromise: Promise<void> | null = null;
    private camera: Camera | null = null;
    private cameraUniform: CameraUniform | null = null;
    private cameraBuffer: GPUBuffer | null = null;
    private cameraBindGroup: GPUBindGroup | null = null;
    private context: GPUCanvasContext | null = null;
    private pipeline: GPURenderPipeline | null = null;
    private vertexBuffers: Array<GPUBuffer> = [];
    private indexLists: Array<Uint16Array> = [];
    private indexBuffers: Array<GPUBuffer> = [];
    private depthTexture: DepthTexture | null = null;

    constructor(canvasRef: HTMLCanvasElement) {
        this.canvasRef = canvasRef;
    }

    render() {

        // render pass descriptor
        let renderPassDescriptor: GPURenderPassDescriptor = {
            label: 'basic debug render pass',
            colorAttachments: [
                {
                    view: this.context!.getCurrentTexture().createView(),
                    clearValue: [0.3, 0.3, 0.3, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture!.view,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                depthClearValue: 1.0
            }
        }

        // update the camera
        this.cameraUniform!.updateViewProj(this.camera!);
        this.device!.queue.writeBuffer(this.cameraBuffer!, 0, this.cameraUniform!.viewProj)
        // Get the current texture from the canvas context and
        // set it as the texture to render to.
        for (const attachment of renderPassDescriptor!.colorAttachments) {
            attachment!.view = this.context!.getCurrentTexture().createView();
        }

        // make a command encoder to start encoding commands
        const encoder = this.device!.createCommandEncoder({ label: 'our encoder' });

        

        // make a render pass encoder to encode render specific commands
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(this.pipeline!);
        pass.setBindGroup(0, this.cameraBindGroup, []);
        for (let i in this.vertexBuffers) {
            const vertexBuffer = this.vertexBuffers[i];
            const indices = this.indexLists[i];
            const indexBuffer = this.indexBuffers[i];
            pass.setVertexBuffer(0, vertexBuffer);
            pass.setIndexBuffer(indexBuffer, 'uint16');
            pass.drawIndexed(indices.length)  // call our vertex shader 

        }
        pass.end();
        const commandBuffer = encoder.finish();
        this.device!.queue.submit([commandBuffer]);
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
        this.context = this.canvasRef.getContext('webgpu');
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context?.configure({
            device,
            format: presentationFormat,
        });

        this.depthTexture = new DepthTexture(this.device!, this.context!.canvas.width, this.context!.canvas.height, "depth texture");

        const module = device.createShaderModule({
            label: 'debug shaders',
            code: shader,
        });

        const meshJson = await load3dm() as any;


        this.vertexBuffers = [];
        this.indexBuffers = [];
        this.indexLists = [];
        for (let i in meshJson) {
            let positionData = new Float32Array(meshJson[i].data.attributes.position.array);
            let normalData = new Float32Array(meshJson[i].data.attributes.normal.array);
            let uvData = new Float32Array(meshJson[i].data.attributes.uv.array);
            const vertexBuffer = device.createBuffer({
                label: `vertex buffer for mesh ${i}`,
                size: positionData.byteLength + normalData.byteLength + uvData.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            const indices = new Uint16Array(meshJson[i].data.index.array);

            const indexBuffer = device.createBuffer({
                label: `index buffer for mesh ${i}`,
                size: indices.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });

            // merge the data into one big array
            const count = positionData.length / 3;
            const mergedData = new Float32Array(count * 8);

            for (let j = 0; j < count; j++) {
                mergedData[j * 8 + 0] = positionData[j * 3 + 0];
                mergedData[j * 8 + 1] = positionData[j * 3 + 1];
                mergedData[j * 8 + 2] = positionData[j * 3 + 2];

                mergedData[j * 8 + 3] = normalData[j * 3 + 0];
                mergedData[j * 8 + 4] = normalData[j * 3 + 1];
                mergedData[j * 8 + 5] = normalData[j * 3 + 2];

                mergedData[j * 8 + 6] = uvData[j * 2 + 0];
                mergedData[j * 8 + 7] = uvData[j * 2 + 1];
            }

            this.indexLists.push(indices);
            this.vertexBuffers.push(vertexBuffer);
            this.indexBuffers.push(indexBuffer);
            device.queue.writeBuffer(vertexBuffer, 0, mergedData);
            device.queue.writeBuffer(indexBuffer, 0, indices);
        }

        this.camera = new Camera(this.canvasRef.width / this.canvasRef.height);
        this.cameraUniform = new CameraUniform();
        this.cameraUniform.updateViewProj(this.camera);

        this.cameraBuffer = this.cameraUniform.makeBuffer(device);

        const cameraBindGroupLayout = CameraUniform.makeBindGroupLayout(device);

        this.cameraBindGroup = CameraUniform.makeBindGroup(device, cameraBindGroupLayout, this.cameraBuffer);

        this.pipeline = getPipeline(device, presentationFormat, module, [cameraBindGroupLayout], this.depthTexture);



        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const canvas = entry.target;
                if (canvas instanceof HTMLCanvasElement) {
                    const width = entry.contentBoxSize[0].inlineSize;
                    const height = entry.contentBoxSize[0].blockSize;

                    canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
                    canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
                    this.depthTexture!.resize(canvas.width, canvas.height)
                }
            }
            
            this.render();

        });

        observer.observe(this.canvasRef);
    }

    destroy() {
        this.device?.destroy();
        this.device = null;
        this.initPromise = null;
    }

}