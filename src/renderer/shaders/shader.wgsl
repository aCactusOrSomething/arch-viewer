struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};


@vertex fn vs(
    @location(0) position: vec3f
) -> VertexOutput {

    var output: VertexOutput;

    let scaled = position * 0.00001;
    output.position = vec4f(scaled.xyz, 1.0);
    output.color = vec4f(0.0, 1.0, 0.0, 1.0);
    return output;
}

@fragment fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
    return fsInput.color;
}