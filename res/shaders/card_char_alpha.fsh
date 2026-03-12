#ifdef GL_ES
precision lowp float; 
#endif

uniform sampler2D s_alpha;

varying vec2 v_texCoord;
varying vec4 v_fragmentColor;
void main()
{
	float alpha = texture2D(s_alpha, v_texCoord).r;
	gl_FragColor = vec4(texture2D(CC_Texture0, v_texCoord).rgb*alpha, alpha)*v_fragmentColor;
}
