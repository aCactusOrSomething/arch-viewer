const PI: f32 = 3.14159;

struct CameraUniform {
    view_pos: vec4<f32>,
    view_proj: mat4x4<f32>,
};
@group(0)@binding(0)
var<uniform> camera: CameraUniform;

struct ModelUniform {
    model: mat4x4<f32>,
    model_inverse_transpose: mat4x4<f32>,
};
@group(0)@binding(1)
var<uniform> model_uniform: ModelUniform;

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
    sheen_strength: f32,
    sheen_tint: f32,
    clearcoat_strength: f32,
    clearcoat_gloss: f32,
}
//@group(3)@binding(0)
//var<uniform> material_vals: MaterialVals;

// textures
@group(2) @binding(0)
var linear_sampler: sampler;
@group(2) @binding(1)
var base_color_tex: texture_2d<f32>;
@group(2) @binding(2)
var normal_map_tex: texture_2d<f32>;
@group(2) @binding(3)
var roughness_metallic_tex: texture_2d<f32>;
@group(2) @binding(4)
var specular_tex: texture_2d<f32>;
@group(2) @binding(5)
var sheen_tex: texture_2d<f32>;
@group(2) @binding(6)
var clearcoat_tex: texture_2d<f32>;
@group(2) @binding(7)
var anisotropic_tex: texture_2d<f32>;
@group(2) @binding(8)
var subsurface_tex: texture_2d<f32>;


struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f,
    @location(4) bitangent: vec3f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coords: vec2<f32>,
    @location(1) world_normal: vec3<f32>,
    @location(2) world_position: vec3<f32>,
    @location(3) tangent: vec3f,
    @location(4) bitangent: vec3f,
};

@vertex fn vs(
    input: VertexInput,
) -> VertexOutput {

    var output: VertexOutput;

    output.position = camera.view_proj * vec4f(input.position.xzy,  1.0);
    output.tex_coords = input.uv;
    output.world_normal = normalize(
        (model_uniform.model_inverse_transpose * vec4f(input.normal.xzy, 0.0)).xyz
    );
    output.world_position = (model_uniform.model * vec4f(input.position.xzy, 1.0)).xyz;
    output.tangent = input.tangent.xzy;
    output.bitangent = input.bitangent.xzy;
    return output;
}

@fragment fn fs(input: VertexOutput) -> @location(0) vec4f {
    var mat: MaterialVals;
    mat.base_color = textureSample(base_color_tex, linear_sampler, input.tex_coords).xyz;
    
    var r_m: vec2f = textureSample(roughness_metallic_tex, linear_sampler, input.tex_coords).gb;
    mat.roughness = r_m.x;
    mat.metallic = r_m.y;
        
    var spec: vec2f = textureSample(specular_tex, linear_sampler, input.tex_coords).gb;
    mat.specular_tint = spec.x;
    mat.specular_strength = spec.y;

    var sheen: vec2f = textureSample(sheen_tex, linear_sampler, input.tex_coords).gb;
    mat.sheen_tint = sheen.x;
    mat.sheen_strength =  sheen.y;

    var clearcoat: vec2f = textureSample(clearcoat_tex, linear_sampler, input.tex_coords).gb;
    mat.clearcoat_gloss = clearcoat.x;
    mat.clearcoat_strength = clearcoat.y;

    mat.anisotropic = textureSample(anisotropic_tex, linear_sampler, input.tex_coords).r;
    mat.subsurface = textureSample(subsurface_tex, linear_sampler, input.tex_coords).r;

    let tbn = mat3x3f(
        normalize(input.tangent),
        normalize(input.bitangent),
        normalize(input.world_normal),
    );

    let normal_sample = textureSample(normal_map_tex, linear_sampler, input.tex_coords).xyz;
    
    let tangent_space_normal = normal_sample * 2.0 - 1.0;
    let world_normal = normalize(tbn * tangent_space_normal);


    // vectors
    let light_dir = normalize(light.position.xyz - input.world_position);
    let view_dir = normalize(camera.view_pos.xyz - input.world_position);
    let reflect_dir = reflect(-light_dir, world_normal);
    let normal_dir = normalize(world_normal);
    let half_dir = normalize(light_dir + view_dir);
    // cosine
    let cos_theta_d = max(dot(light_dir, half_dir), 0.0);
    let cos_theta_l = max(dot(light_dir, normal_dir), 0.0);
    let cos_theta_v = max(dot(view_dir, normal_dir), 0.0);
    let cos_theta_h = max(dot(half_dir, normal_dir), 0.0); 
    let cos_theta_ht = max(dot(half_dir, input.tangent), 0.0);
    let cos_theta_hb = max(dot(half_dir, input.bitangent), 0.0);

    // angle (we dont need ALL the angles)
    let theta_d =  acos(cos_theta_d);

    // diffuse calcs
    let fd90 = fd90(mat.roughness, cos_theta_d);
    let fss90 = fss90(mat.roughness, cos_theta_d);
    let burley_diffuse = burley_diffuse(mat.base_color, fd90, cos_theta_l, cos_theta_v);
    let fss = fss(fss90, cos_theta_l, cos_theta_v);
    let subsurface_func = subsurface_func(fss, cos_theta_l, cos_theta_v);
    let sheen_color = sheen_color(mat.base_color, mat.sheen_tint);
    let sheen_func = sheen_func(mat.sheen_strength, sheen_color, cos_theta_d);
    
    let diffuse_color = diffuse_func(mat.base_color, burley_diffuse, subsurface_func, mat.subsurface, sheen_func);

    // specular calcs
    let alpha = alpha(mat.roughness);
    let aspect = aspect(mat.anisotropic);
    let a_x = a_x(alpha, aspect);
    let a_y = a_y(alpha, aspect);
    let microfacet = microfacet(a_x, a_y, half_dir, cos_theta_h, cos_theta_ht, cos_theta_hb);
    //let microfacet = microfacet(alpha, cos_theta_h);
    let fresnel = fresnel(mat.specular_strength, cos_theta_d);
    let attenuation = attenuation(half_dir, light_dir, view_dir, alpha);
    let specular_color = specular_func(microfacet, fresnel, attenuation, cos_theta_l, cos_theta_v);

    // clearcoat calcs
    let alpha_cc = alpha_cc(mat.clearcoat_gloss);
    let microfacet_cc = microfacet_cc(alpha_cc, cos_theta_h);
    let fresnel_cc = fresnel_cc(mat.clearcoat_strength, cos_theta_d);
    let attenuation_cc= attenuation_cc(half_dir, light_dir, view_dir, alpha_cc);
    let clearcoat_color = clearcoat_func(microfacet_cc, fresnel_cc, attenuation_cc, cos_theta_l, cos_theta_v);

    let result = (diffuse_color * (1 - mat.metallic) + specular_color * mix(vec3f(1.0), mat.base_color, mat.metallic) + clearcoat_color) * light.color.xyz * cos_theta_l;

    return vec4f(result, 1);
}

// ***********
// * DIFFUSE *
// ***********

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
    sheen_strength: f32,
    sheen_color: vec3<f32>,
    cos_theta_d: f32
) -> vec3<f32> {
    return sheen_color * sheen_strength * pow(1 - cos_theta_d, 5);
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

// ************
// * SPECULAR *
// ************

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

// anisotropic implementation
fn microfacet(
    a_x: f32,
    a_y: f32,
    half_dir: vec3<f32>,
    cos_theta_h: f32,
    cos_theta_ht: f32,
    cos_theta_hb: f32,
) -> f32 {
    let denom = (
        (cos_theta_ht * cos_theta_ht) / (a_x * a_x) +
        (cos_theta_hb * cos_theta_hb) / (a_y * a_y) +
        (cos_theta_h * cos_theta_h)
    );
    return 1 / (PI * a_x * a_y * denom * denom);
}

fn fresnel(specular_strength: f32, cos_theta_d: f32) -> f32 {
    return specular_strength + (1.0 - specular_strength) * pow(1.0 - cos_theta_d, 5.0);
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

// *************
// * CLEARCOAT *
// *************

fn alpha_cc(clearcoat_gloss: f32) -> f32 {
    return mix(0.1, 0.001, clearcoat_gloss);
}

fn microfacet_cc(alpha_cc: f32, cos_theta_h: f32) -> f32 {
    let a2 = alpha_cc * alpha_cc;
    let denom = (cos_theta_h * cos_theta_h * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom);
}

// these are just shells around the equivalent specular function, since they share implementation
fn fresnel_cc(clearcoat_strength: f32, cos_theta_d: f32) -> f32 {
    return fresnel(clearcoat_strength, cos_theta_d);
}

fn attenuation_cc(half_dir: vec3f, light_dir: vec3f, view_dir: vec3f, alpha_cc: f32) -> f32 {
    return attenuation(half_dir, light_dir, view_dir, alpha_cc);
}

fn clearcoat_func(microfacet_cc: f32, fresnel_cc: f32, attenuation_cc: f32, cos_theta_l: f32, cos_theta_v: f32) -> f32{
    return specular_func(microfacet_cc, fresnel_cc, attenuation_cc, cos_theta_l, cos_theta_v);
}
