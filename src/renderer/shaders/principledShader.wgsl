const PI: f32 = 3.14159;

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

struct MaterialVals {
    base_color: vec3<f32>,
    subsurface: f32,
    metallic: f32,
    specular_strength: f32,
    specular_tint: f32,
    roughness: f32,
    anisotropic: f32,
    sheen: f32,
    sheen_tint: f32,
    clearcoat_strength: f32,
    clearcoat_gloss: f32,
}
@group(2)@binding(0)
var<uniform> material_vals: MaterialVals;

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
    output.world_normal = model.normal.xzy;
    output.world_position = model.position.xzy;
    return output;
}

@fragment fn fs(input: VertexOutput) -> @location(0) vec4f {
    var mat: MaterialVals;
    mat.base_color = vec3f(0.5, 0.5, 0.5);
    mat.subsurface = 0.005;
    mat.metallic = 0.5;
    mat.specular_strength = 0.5;
    mat.specular_tint = 0.5;
    mat.roughness = 0.5;
    mat.anisotropic = 0.5;
    mat.sheen =  0.5;
    mat.sheen_tint = 0.5;
    mat.clearcoat_strength = 0.5;
    mat.clearcoat_gloss = 0.5;

    // vectors
    let light_dir = normalize(light.position.xyz - input.world_position);
    let view_dir = normalize(camera.view_pos.xyz - input.world_position);
    let reflect_dir = reflect(-light_dir, input.world_normal);
    let normal_dir = normalize(input.world_normal);
    let half_dir = normalize(mix(light_dir, view_dir, 0.5));

    // cosine
    let cos_theta_d = dot(light_dir, half_dir);
    let cos_theta_l = dot(light_dir, normal_dir);
    let cos_theta_v = dot(view_dir, normal_dir);
    let cos_theta_h = dot(half_dir, normal_dir); 

    // angle (we dont need ALL the angles)
    let theta_d =  acos(cos_theta_d);

    // diffuse calcs
    let fd90 = fd90(mat.roughness, cos_theta_d);
    let fss90 = fss90(mat.roughness, cos_theta_d);
    let burley_diffuse = burley_diffuse(mat.base_color, fd90, cos_theta_l, cos_theta_v);
    let fss = fss(fss90, cos_theta_l, cos_theta_v);
    let subsurface_func = subsurface_func(fss, cos_theta_l, cos_theta_v);
    let sheen_color = sheen_color(mat.base_color, mat.sheen_tint);
    let sheen_func = sheen_func(mat.sheen, sheen_color, cos_theta_d);
    
    let diffuse_color = diffuse_func(mat.base_color, burley_diffuse, subsurface_func, mat.subsurface, sheen_func);

    // specular calcs
    let alpha = alpha(mat.roughness);
    let aspect = aspect(mat.anisotropic);
    let a_x = a_x(alpha, aspect);
    let a_y = a_y(alpha, aspect);
    let microfacet = microfacet(a_x, a_y, half_dir, cos_theta_h);
    let fresnel = fresnel(mat.specular_strength, theta_d);
    let attenuation = attenuation(half_dir, light_dir, view_dir, alpha);
    let specular_color = specular_func(microfacet, fresnel, attenuation, cos_theta_l, cos_theta_v);

    let result = (diffuse_color * (1 - mat.metallic) + specular_color * mix(vec3f(1.0), mat.base_color, mat.metallic));
    //let result = specular_color;

    return vec4f(result, 1);
}

fn fd90(
    roughness: f32,
    cos_theta_d: f32
) -> f32 {
    return 0.5 + 2 * roughness * cos_theta_d * cos_theta_d;
}

fn fss90(
    roughness: f32,
    cos_theta_d: f32
) -> f32 {
    return roughness * cos_theta_d * cos_theta_d;
}

fn burley_diffuse(
    base_color: vec3<f32>,
    fd90: f32,
    cos_theta_l: f32,
    cos_theta_v: f32
) -> vec3<f32> {
    let f = fd90 - 1;
    return (base_color / PI) * 
        (1 + (fd90 - 1) * pow(1 - cos_theta_l, 5)) *
        (1 + (fd90 - 1) * pow(1 - cos_theta_v, 5));
}

fn fss(
    fss90: f32,
    cos_theta_l: f32,
    cos_theta_v: f32
) -> f32 {
    return mix(1.0, 
        fss90,
        pow((1 - cos_theta_l), 5),
    ) * mix(1.0,
        fss90,
        pow((1 - cos_theta_v), 5)
    );
}

fn subsurface_func(
    fss: f32,
    cos_theta_l: f32,
    cos_theta_v: f32
) -> f32 {
    return 1.25 * (fss * (1 / (cos_theta_l + cos_theta_v) - 0.5) + 0.5);
}

fn sheen_color(
    base_color: vec3<f32>,
    sheen_tint: f32
) -> vec3<f32> {
    return mix(vec3(1.0), base_color, sheen_tint);
}

fn sheen_func(
    sheen: f32,
    sheen_color: vec3<f32>,
    cos_theta_d: f32
) -> vec3<f32> {
    return sheen_color * sheen * pow(1 - cos_theta_d, 5);
}

fn diffuse_func(
    base_color: vec3<f32>,
    burley_diffuse: vec3<f32>,
    subsurface_func: f32,
    subsurface: f32,
    sheen_func: vec3<f32>
) -> vec3<f32> {
    return base_color * mix(burley_diffuse, vec3(subsurface_func), subsurface) + sheen_func;
}

fn alpha(roughness: f32) -> f32 {
    return roughness * roughness;
}

fn aspect(anisotropic: f32) -> f32 {
    return sqrt(1 - 0.9 * anisotropic);
}

fn a_x(alpha: f32, aspect: f32) -> f32 {
    return alpha / aspect;
}

fn a_y(alpha: f32, aspect: f32) -> f32 {
    return alpha * aspect;
}

fn microfacet(
    a_x: f32,
    a_y: f32,
    half_dir: vec3<f32>,
    cos_theta_h: f32,
) -> f32 {
    return 1 / (
        PI * a_x * a_y *
        pow(
            pow(half_dir.x, 2) / pow(a_x, 2) + 
            pow(half_dir.y, 2) / pow(a_y, 2) + 
            pow(cos_theta_h, 2),
        2)
    );
}

fn fresnel(specular_strength: f32, theta_d: f32) -> f32 {
    return mix(specular_strength, 1, (1 - theta_d));
}

fn omega(x: f32) -> f32 {
    return (-1 + sqrt(1 + (1 / pow(x, 2)))) / 2;
}

fn attenuation_helper(vec_h: vec3f, vec_s: vec3f, alpha: f32) -> f32 {
    let dprod = dot(vec_h, vec_s);
    let o_denom = (alpha * sqrt(1 - pow(dprod, 2)));
    return 1 / (1 + omega(dprod / o_denom));
}

fn attenuation(half_dir: vec3f, light_dir: vec3f, view_dir: vec3f, alpha: f32) -> f32 {
    return attenuation_helper(half_dir, light_dir, alpha) * attenuation_helper(half_dir, view_dir, alpha);
}

fn specular_func(microfacet: f32, fresnel: f32, attenuation: f32, cos_theta_l: f32, cos_theta_v: f32) -> f32{
    return (microfacet * fresnel * attenuation) / (4 * cos_theta_l * cos_theta_v);
}