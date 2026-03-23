
export interface Texture {
    texture: GPUTexture,
    view: GPUTextureView,
    sampler: GPUSampler,
}

export class DepthTexture implements Texture {
    texture: GPUTexture;
    view: GPUTextureView;
    sampler: GPUSampler;
    static DEPTH_FORMAT: GPUTextureFormat = "depth32float";

    private device: GPUDevice;
    private label: string;

    constructor(device: GPUDevice, width: number, height: number, label: string) {
        this.device = device;
        this.label = label;
        this.texture = this.build(width, height);
        this.view = this.texture.createView();
        this.sampler = device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "nearest",
            compare: "less-equal",
            lodMaxClamp: 100.0,
            lodMinClamp: 0.0,
        });

    }

    private build(width: number, height: number) {
        const texture = this.device.createTexture({
            label: this.label,
            size: {
                width: Math.max(width, 1),
                height: Math.max(height, 1),
            },
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: DepthTexture.DEPTH_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            viewFormats: []
        });

        return texture
    }

    resize(width: number, height: number) {
        this.texture = this.build(width, height);
        this.view = this.texture.createView();
    }
}