# Principled BRDF Notes

## Sources

- [Physically Based Shading at Disney](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf) by Brent Burley, Walt Disney Animation Studios
- [The Secret Behind Photorealistic and Stylized Graphics](https://www.youtube.com/watch?v=KkOkx0FiHDA) by Acerola

## Parameters

### Material Components

- _baseColor_: The surface color, usually supplied by texture maps.
- _subsurface_: Controls diffuse shape using a subsurface approximation.
- _metallic_: The metallic-ness (0 = dielectric, 1 = metallic). Used to blend between two different models.
- _specularStrength_: Incident specular amount.
- _specularTint_: Tints _specular_ towards _baseColor_.
- _roughness_: Surface roughness, controls both diffuse and specular response.
- _anisotropic_: Degree of anisotropy (if the material reflects differently in different directions). 0 = isotropic, 1 = maximally anisotropic.
- _sheen_: an additional grazing component, primarily intended for cloth.
- _sheenTint_: amount to tint _sheen_ towards _baseColor_.
- _clearcoatStrength_: A second, special-purpose specular lobe.
- _clearcoatGloss_: Controls clearcoat glossiness (0: a "satin" appearance, 1: a "gloss" appearance)

### Vectors

- _viewVector_: direction towards camera
- _lightVector_: direction of incoming light
- _normalVector_: direction orthogonal to the surface
- _reflectedVector_: direction of reflected light
- _halfVector_: halfway vector of _viewVector_ and _lightVector_

### Angles

- _thetaD_: angle between _lightVector_ and _halfVector_
- _thetaL_: angle between _lightVector_ and _normalVector_
- _thetaV_: angle between _viewVector_ and _normalVector_
- _thetaH_: angle between _halfVector_ and _normalVector_

_Remember that the dotproduct of two normalized vectors is equal to the cosine of the angle between those vectors. therefore, `cos(theta)` can be replaced with `A dot B`, where A and B are the normalized vectors that theta runs between._

### Other

- _lightColor_: color of incoming light
- _pos_: position in space

## Functions

### DIFFUSE

__Fd90__ = 0.5 + 2 * _roughness_ * cos(_thetaD_)^2

__BurleyDiffuseFunction__ = (_baseColor_ / ___PI___)(1 + (__Fd90__ - 1)(1 - cos(_thetaL_))^5)(1 + (__Fd90__ - 1)(1 - cos(_thetaV_))^5)

__Fss90__ = _roughness_ * cos(_thetaD_)^2

__Fss__ = lerp(1, __Fss90__, (1 - cos(_thetaL_))^5) * lerp(1, __Fss90__, (1 - cos(_thetaV_))^5)

__SubsurfaceFunction__ = 1.25 * (__Fss__ * (1 / (cos(_thetaL_) + cos(_thetaV_)) - 0.5) + 0.5)

__sheenColor__ = lerp(1, _baseColor_, _sheenTint_)

__FSheen__ = _sheen_ * __sheenColor__ * (1 - cos(_thetaD_))^5

__DiffuseFunction__ = _baseColor_ * lerp(__BurleyDiffuseFunction__, __SubsurfaceFunction__, _subsurface_) + __FSheen__

### SPECULAR

__alpha__ = _roughness_^2

__aspect__ = sqrt(1 - 0.9 * _anisotropic_)

__aX__ = __alpha__ / __aspect__

__aY__ = __alpha__ * __aspect__

__Microfacet__  = 1 / (___PI___  * __aX__ * __aY__ * ((_halfVector_ DOT _xComponent_)^2 / __aX__^2 + (_halfVector_ DOT _yComponent_)^2 /__aY__^2 + (_halfVector_ DOT _normalVector_)^2)^2)   

__Fresnel__ = lerp(_specularStrength_, 1, (1 - _thetaD_))

__omega__(_x_) = (-1 + sqrt(1 + (1 / _x_^2))) / 2

__Attenuation1__(_vectorH_, _vectorS_) = 1 / (1 + __omega__((_vectorH_ DOT _vectorS_) / (__alpha__ * sqrt(1 - (_vectorH_ DOT _vectorS_)^2))))

__Attenuation__ = __Attenuation1__(_halfVector_, _lightVector_) * __Attenuation1__(_halfVector_, _viewVector_)

__SpecularFunction__ = (__Microfacet__ * __Fresnel__ * __Attenuation__) / (4 * cos(_thetaL_) * cos(_thetaV_))

### CLEARCOAT

*note that the Clearcoat component is basically a 2nd specular component. it just uses it's own values for specularStrength and roughness (clearcoatStrength and clearcoatGloss, respectively), as well as a non-anisotropic formula for the Microfacet component.*

__alphaCC__ = lerp(0.1, 0.001, _clearcoatGloss_)

__MicrofacetCC__ = __alphaCC__^2 / (___PI___ * ((__alphaCC__^2 - 1) * cos(_thetaH_)^2 + 1)^2)

__FresnelCC__ = lerp(_clearcoatStrength_, 1, (1 - _thetaD_))

__Attenuation1CC__(_vectorH_, _vectorS_): 1 / (1 + __omega__((_vectorH_ DOT _vectorS_) / __alphaCC__ * sqrt(1 - (_vectorH_ DOT _vectorS_)^2)))

__AttenuationCC__: __Attenuation1CC__(_halfVector_, _lightVector_), * __Attenuation1CC__(_halfVector_, _viewVector_)

__ClearcoatFunction__ = (__MicrofacetCC__ * __FresnelCC__ * __AttenuationCC__) / (4 * cos(_thetaL_) * cos(_thetaV_))

### FINALLY...

__BRDF__ = __DiffuseFunction__ * (1 - _metallic_) + __SpecularFunction__ * lerp(1, _baseColor_, _metallic_) + __ClearcoatFunction__

__OutgoingLight__ = __BRDF__ * _lightColor_ * cos(_thetaL_)

## Implementation

I think it would be best to provide each parameter in two sections:
- as a scalar uniform
- as an optional texture which can modulate the scalar

Textures would be:
- _baseColor_ (should probably be its own texture, since it needs RGB components)
- _metallic_ (B), _roughness_ (G) (standard as described in GLTF)
- _specularStrength_, _specularTint_
- _sheen_, _sheenTint_
- _clearcoatStrength_, _clearcoatGloss_
- _anisotropic_ 
- _subsurface_