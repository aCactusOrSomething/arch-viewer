import { mat4, vec3, type Vec3 } from 'wgpu-matrix'

export class Camera {
    public eye: Float32Array;
    public target: Float32Array;
    public up: Float32Array;
    public aspectRatio: number;
    public fovY: number;
    public nearZ: number;
    public farZ: number;

    constructor(
        aspectRatio: number,
        eye: Float32Array = new Float32Array([0, 10, 40]),
        target: Float32Array = new Float32Array([0, 0, 0]),
        up: Float32Array = new Float32Array([0, 1, 0]),
        fovY: number = Math.PI / 4,
        nearZ: number = 0.01,
        farZ: number = 100.0,
    ) {
        this.eye = eye;
        this.target = target;
        this.up = up;
        this.aspectRatio = aspectRatio;
        this.fovY = fovY;
        this.nearZ = nearZ;
        this.farZ = farZ;
    }

    buildViewProjectionMatrix() {
        let view = mat4.lookAt(this.eye, this.target, this.up);
        let proj = mat4.perspective(this.fovY, this.aspectRatio, this.nearZ, this.farZ);

        return mat4.multiply(proj, view) as Float32Array<ArrayBuffer>;
    }

    updateCamera() {
        const SPEED = 1.0;

        let forward = vec3.subtract(this.target, this.eye);
        let forwardNorm = vec3.normalize(forward);
        let forwardMag = vec3.len(forward);
        let right = vec3.cross(forwardNorm, this.up);

        this.eye = vec3.subtract(this.target,
            vec3.mulScalar(
                vec3.normalize(
                    vec3.add(forward, vec3.mulScalar(right, SPEED))
                ),
                forwardMag
            )
        );
    }
}

export class CameraUniform {
    public viewProj: Float32Array<ArrayBuffer>;
    // this type is less idiomatic than Mat4, but avoids typescript errors

    constructor() {
        this.viewProj = mat4.identity();
    }

    updateViewProj(camera: Camera) {
        camera.updateCamera();
        this.viewProj = camera.buildViewProjectionMatrix();
    }

    makeBuffer(device: GPUDevice, camera: Camera) {
        return device.createBuffer({
            label: "Camera Buffer",
            size: camera.eye.byteLength + this.viewProj.byteLength + 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    static makeBindGroupLayout(device: GPUDevice) {
        return device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        hasDynamicOffset: false,
                        type: 'uniform'
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        hasDynamicOffset: false,
                        type: 'uniform'
                    },
                }
            ],
            label: "camera bind group layout",
        });
    }

    static makeBindGroup(device: GPUDevice, layout: GPUBindGroupLayout, cameraBuffer: GPUBuffer, modelBuffer: GPUBuffer) {
        return device.createBindGroup({
            layout: layout,
            entries: [
                {
                    binding: 0,
                    resource: cameraBuffer,
                },
                {
                    binding: 1,
                    resource: modelBuffer,
                }
            ],
            label: "camera bind group",
        });
    }
}