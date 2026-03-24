export interface LightUniform {
    position: Float32Array,
    color: Float32Array,
}

export function toBufferSource(lightUniform: LightUniform) {
    return Float32Array.of(...lightUniform.position, ...lightUniform.color)
}