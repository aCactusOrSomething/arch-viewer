struct CameraUniform {
    view_pos: vec4<f32>,
    view_proj: mat4x4<f32>,
};
@group(0)@binding(0)
var<uniform> camera: CameraUniform;

struct Light {
    position: vec4<f32>,
    color: vec4<f32>,
}
@group(1) @binding(0)
var<uniform> light: Light;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coords: vec2<f32>,
    @location(1) world_normal: vec3<f32>,
    @location(2) world_position: vec3<f32>,
};

@vertex fn vs(
    model: VertexInput,
) -> VertexOutput {

    var output: VertexOutput;

    output.position = camera.view_proj * vec4f(model.position.xzy,  1.0);
    output.tex_coords = model.uv;
    output.world_normal = model.normal;
    output.world_position = model.position;
    return output;
}

@fragment fn fs(input: VertexOutput) -> @location(0) vec4f {
    let object_color: vec3<f32> = vec3f(0.5);
    let ambient_strength = 0.5;
    let ambient_color = light.color.xyz * ambient_strength;
    
    let light_dir = normalize(light.position.xyz - input.world_position);
    let diffuse_strength = max(dot(input.world_normal, light_dir), 0.0);
    let diffuse_color = light.color.xyz * diffuse_strength;

    let view_dir = normalize(camera.view_pos.xyz - input.world_position);
    let reflect_dir = reflect(-light_dir, input.world_normal);

    let specular_strength = pow(max(dot(view_dir, reflect_dir), 0.0), 32.0);
    let specular_color = specular_strength * light.color.xyz;

    let result = (ambient_color + diffuse_color + specular_color) * object_color;

    return vec4f(result, 1);
}