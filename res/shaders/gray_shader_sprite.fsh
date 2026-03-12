#ifdef GL_ES
precision lowp float;
#endif

varying vec2 v_texCoord;
varying vec4 v_fragmentColor;
void main()
{
	float alpha = texture2D(CC_Texture0, v_texCoord).a;
	vec4 colorTmp = texture2D(CC_Texture0, v_texCoord);
	float gray = (colorTmp.r*0.2126 + colorTmp.g*0.7152 + colorTmp.b*0.0722);
	gl_FragColor = vec4(gray,gray,gray, alpha);
}