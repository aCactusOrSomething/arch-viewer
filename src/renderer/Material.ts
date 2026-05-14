export interface MaterialUniform {
    baseColor: Float32Array,
    subsurface: Number,
    anisotropic: Number,
    metallic: Number,
    roughness: Number,
    specularStrength: Number,
    specularTint: Number,


    sheenStrength: Number,
    sheenTint: Number,
    clearcoatStrength: Number,
    clearcoatGloss: Number,

    textureUrls: {
        baseColor: string | undefined;
        normalMap: string | undefined;
        // G: Roughness, B: Metallic
        roughness_metallic: string | undefined;
        // G: specularTint, B: specularStrength
        specular: string | undefined;
        // G: sheenTint, B: sheenStrength;
        sheen: string | undefined;
        // G: clearcoatGloss, B: clearcoatStrength
        clearcoat: string | undefined;
        anisotropic: string | undefined;
        subsurface: string | undefined;
    }
}

export const RUSTY_METAL_MATERIAL: MaterialUniform = {
    baseColor: new Float32Array([1, 1, 1]),
    subsurface: 1,
    anisotropic: 1,

    metallic: 1,
    roughness: 1,

    specularStrength: 1,
    specularTint: 1,

    sheenStrength: 1,
    sheenTint: 1,

    clearcoatStrength: 1,
    clearcoatGloss: 1,

    textureUrls: {
        baseColor: '/materials/rust/tex-basecolor.png',
        normalMap: '/materials/rust/tex-normal.png',
        roughness_metallic: '/materials/rust/tex-roughness-metallic.png',
        specular: '/materials/rust/tex-specular.png',
        sheen: '/materials/rust/tex-sheen.png',
        clearcoat: '/materials/rust/tex-specular.png',
        anisotropic: '/materials/rust/tex-anisotropic.png',
        subsurface: '/materials/rust/tex-subsurface.png',
    }
}

export async function loadImageBitmap(url: string) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}

export function makeMaterialBindGroupLayout(device: GPUDevice) {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                sampler: { 
                    type: "filtering"
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            }
        ],
        label: "material bind group layout",
    });
}

export function makeMaterialBindGroup(device: GPUDevice, layout: GPUBindGroupLayout, sampler: GPUSampler, baseColorTex: GPUTexture) {
    return device.createBindGroup({
        layout: layout,
        entries: [
            {
                binding: 0,
                resource: sampler,
            },
            {
                binding: 1,
                resource: baseColorTex,
            }
        ],
        label: "material bind group",
    })
}