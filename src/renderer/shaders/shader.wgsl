struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex fn vs(
    model: VertexInput,
) -> VertexOutput {

    var output: VertexOutput;

    output.position = vec4f(model.position.xzy * 0.05,  1.0);
    output.color = vec4f(model.normal, 1.0);
    return output;
}

@fragment fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
    return fsInput.color;
}