import { mat4, type Mat4 } from 'wgpu-matrix'

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
        eye: Float32Array = new Float32Array([0, 1, 2]),
        target: Float32Array = new Float32Array([0, 0, 0]),
        up: Float32Array = new Float32Array([0, 1, 0]),
        fovY: number = 45.0,
        nearZ: number = 0.1,
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

        return mat4.multiply(view, proj);
    }
}

export class CameraUniform {
    public viewProj: Mat4;

    constructor() {
        this.viewProj = mat4.identity()
    }

    updateViewProj(camera: Camera) {
        this.viewProj = camera.buildViewProjectionMatrix()
    }
}