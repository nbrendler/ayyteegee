#extension GL_OES_standard_derivatives: enable

precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform sampler2D iChannel0;
uniform vec4 iChannelResolution[4];

varying vec2 fragCoord;

#define iTime time
#define iResolution resolution

vec4 texture(sampler2D s, vec2 c) { return texture2D(s,c); }


/* There are a few shaders on this site already that attempt to do this (most notably
 * <https://www.shadertoy.com/view/ldlSzS>), but none of them were quite what I wanted,
 * so I made this one myself.
 * 
 * It has an interface almost as simple as texture's, with only one extra parameter
 * for the resolution of the texture. You don't need to pass in the screen resolution
 * or anything, since it uses dFdx and dFdy. I haven't tested this, but it should also
 * work on textures that have been transformed in complex ways, such as ones in 3D
 * environments.
 * It doesn't use fwidth. It uses the Pythagorean Theorem instead. I don't really get
 * why fwidth doesn't just work like that in the first place... Maybe fwidth has some
 * hidden meaning that I don't understand? In any case, it isn't the right function
 * for this.
 * It also has no branching and only calls texture once, using the GPU's built-in
 * bilinear interpolation.
 * 
 * You can honestly just lift the v2len and textureBlocky functions out of this shader,
 * put them into your own, and use them. It's very easy.
 * 
 * Since copyright law exists, I guess I ought to put this under a license of some kind
 * if I want you to be able to use it. It's tiny and actually rather self-evident, so
 * I'll put it under the CC0 1.0 Public Domain Dedication:
 * <http://creativecommons.org/publicdomain/zero/1.0/>
 * Ta-dahhh! Now you can use it however you want without even giving me credit.
 */



// change this value to compare different interpolation methods.
// 
// 0: antialiased blocky interpolation
// 1: linear interpolation
// 2: aliased blocky interpolation
#define RENDER_MODE 0



// basically calculates the lengths of (a.x, b.x) and (a.y, b.y) at the same time
vec2 v2len(in vec2 a, in vec2 b) {
    return sqrt(a*a+b*b);
}


// samples from a linearly-interpolated texture to produce an appearance similar to
// nearest-neighbor interpolation, but with resolution-dependent antialiasing
// 
// this function's interface is exactly the same as texture's, aside from the 'res'
// parameter, which represents the resolution of the texture 'tex'.
vec4 textureBlocky(in sampler2D tex, in vec2 uv, in vec2 res) {
    uv *= res; // enter texel coordinate space.
    
    
    vec2 seam = floor(uv+.5); // find the nearest seam between texels.
    
    // here's where the magic happens. scale up the distance to the seam so that all
    // interpolation happens in a one-pixel-wide space.
    uv = (uv-seam)/v2len(dFdx(uv),dFdy(uv))+seam;
    
    uv = clamp(uv, seam-.5, seam+.5); // clamp to the center of a texel.
    
    
    return texture(tex, uv/res).xxxx; // convert back to 0..1 coordinate space.
}



void main() {
    vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / min(iResolution.x, iResolution.y);
    uv /= 8.;
    
    gl_FragColor = textureBlocky(iChannel0, uv, iChannelResolution[0].xy);
}
