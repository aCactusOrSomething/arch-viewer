export function computeTangents(
    positions: Float32Array,
    normals: Float32Array,
    uvs: Float32Array,
    indices: Uint16Array,
): { tangents: Float32Array, bitangents: Float32Array } {
    const vertexCount = positions.length / 3;
    const tangents = new Float32Array(vertexCount * 3);
    const bitangents = new Float32Array(vertexCount * 3);
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];

        const p0 = [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]];
        const p1 = [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]];
        const p2 = [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]];

        const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

        const uv0 = [uvs[i0 * 2], uvs[i0 * 2 + 1]];
        const uv1 = [uvs[i1 * 2], uvs[i1 * 2 + 1]];
        const uv2 = [uvs[i2 * 2], uvs[i2 * 2 + 1]];

        const duv1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
        const duv2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];

        const denom = (duv1[0] * duv2[1] - duv2[0] * duv1[1]);

        if (Math.abs(denom) < 1e-8) continue;

        const tan = [
            (edge1[0] * duv2[1] - edge2[0] * duv1[1]) / denom,
            (edge1[1] * duv2[1] - edge2[1] * duv1[1]) / denom,
            (edge1[2] * duv2[1] - edge2[2] * duv1[1]) / denom,
        ];

        const bitan = [
            (edge2[0] * duv1[0] - edge1[0] * duv2[0]) / denom,
            (edge2[1] * duv1[0] - edge1[1] * duv2[0]) / denom,
            (edge2[2] * duv1[0] - edge1[2] * duv2[0]) / denom,
        ];

        for (const idx of [i0, i1, i2]) {
            tangents[idx * 3 + 0] += tan[0];
            tangents[idx * 3 + 1] += tan[1];
            tangents[idx * 3 + 2] += tan[2];
            bitangents[idx * 3 + 0] += bitan[0];
            bitangents[idx * 3 + 1] += bitan[1];
            bitangents[idx * 3 + 2] += bitan[2];
        }
    }

    // normalize / orthonganolize
    for (let i = 0; i < vertexCount; i++) {
        const n = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
        let t = [tangents[i * 3], tangents[i * 3 + 1], tangents[i * 3 + 2]];

        const nDotT = n[0] * t[0] + n[1] * t[1] + n[2] * t[2];
        t = [t[0] - n[0] * nDotT, t[1] - n[1] * nDotT, t[2] - n[2] * nDotT];

        const mag = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]);
        if (mag > 1e-8) {
            tangents[i * 3 + 0] = t[0] / mag;
            tangents[i * 3 + 1] = t[1] / mag;
            tangents[i * 3 + 2] = t[2] / mag;
        }

        bitangents[i * 3] = n[1] * tangents[i * 3 + 2] - n[2] * tangents[i * 3 + 1];
        bitangents[i * 3 + 1] = n[2] * tangents[i * 3] - n[0] * tangents[i * 3 + 2];
        bitangents[i * 3 + 2] = n[0] * tangents[i * 3 + 1] - n[1] * tangents[i * 3];
    }

    return { tangents, bitangents };
}