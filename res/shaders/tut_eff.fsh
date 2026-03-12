#ifdef GL_ES
precision lowp float; 
#endif

uniform sampler2D s_alpha;
uniform vec2 v_maskCoord

varying vec2 v_texCoord;
varying vec4 v_fragmentColor;
void main()
{
	float alpha = min(texture2D(s_alpha, v_maskCoord).a, v_fragmentColor.a);
	vec4 color = texture2D(CC_Texture0, v_texCoord);
	gl_FragColor = vec4(color.rgb*alpha, alpha);
}
