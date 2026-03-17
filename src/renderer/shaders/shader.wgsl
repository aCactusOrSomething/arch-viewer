struct VertexInput {
    color: vec4f,
    scale: vec2f,
    offset: vec2f,
};
@group(0) @binding(0) var<uniform> vertexInput: VertexInput;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex fn vs(
    @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
    let pos = array(
        vec2f( 0.0,  0.5),
        vec2f(-0.5, -0.5),
        vec2f( 0.5, -0.5),
    );

    var output: VertexOutput;
    output.position = vec4f(
        pos[vertexIndex]* vertexInput.scale + vertexInput.offset,
         0.0, 1.0);
    output.color = vertexInput.color;
    return output;
}

@fragment fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
    return fsInput.color;
}