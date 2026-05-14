export interface Material {
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

export const RUSTY_METAL_MATERIAL: Material = {
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

export async function processTextures(material: Material, device: GPUDevice) {
    const textures: GPUTexture[] = await Promise.all(Object.entries(material.textureUrls).map(async entry => {
        let key = entry[0];
        let val = entry[1];
        const source = await loadImageBitmap(val!);
        const texture = device.createTexture({
            label: key + " texture",
            format: 'rgba8unorm',
            size: [source.width, source.height],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        device.queue.copyExternalImageToTexture(
            { source, flipY: true },
            { texture },
            { width: source.width, height: source.height }
        );
        return texture;
    }));
    console.log("A:")
    console.log(textures);
    return textures;
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
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            },
            {
                binding: 5,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            },
            {
                binding: 6,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            },
            {
                binding: 7,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false,
                }
            },
            {
                binding: 8,
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

export function makeMaterialBindGroup(device: GPUDevice, layout: GPUBindGroupLayout, sampler: GPUSampler, textures: GPUTexture[]) {
    console.log('C: ')
    console.log(textures);
    console.log('length of textures is: ' + textures.length);

    let entries: GPUBindGroupEntry[] = [{
        binding: 0,
        resource: sampler,
    }];
    for (let i = 0; i < textures.length; i++) {
        console.log("doing thing #" + i);
        entries.push({
            binding: i+1,
            resource: textures[i].createView()
        });
    }
    console.log(entries);
    return device.createBindGroup({
        layout: layout,
        entries: entries,
        label: "material bind group",
    })
}