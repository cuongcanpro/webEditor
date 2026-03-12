#ifndef DialogGUI_h__
#define DialogGUI_h__

#include "cocos2d.h"
#include "cocos/ui/CocosGUI.h"

using namespace cocos2d;

class DialogGUI : public Layer
{
private:
	float _scale;
	LayerColor *fog;
	Sprite *bg;

	ui::Text *content;

	ui::Button *btnOK;
	ui::Button *btnCancel;

	std::function<void()> fOK;
	std::function<void()> fCancel;
	
public:

	DialogGUI() : Layer()
	{
		initUI();
	}

	~DialogGUI()
	{

	}

	static DialogGUI *create(Node *p, std::string msg, int btn, std::function<void()> f1 = [](){}, std::function<void()> f2 = [](){})
	{
		DialogGUI *ret = new DialogGUI();
		if (btn == 1)
		{
			ret->showOK(msg, f1);
		}
		else
		{
			ret->showOKCancel(msg, f1, f2);
		}
		p->addChild(ret,999);
		return ret;
	}
	
	void initUI();

	void showDialog();
	void hideDialog(int tag);

	void showOK(std::string msg, std::function<void()> f = [](){});
	void showOKCancel(std::string msg, std::function<void()> f1 = [](){}, std::function<void()> f2 = [](){});

	void onButtonEvent(Ref *pSender, ui::Widget::TouchEventType type);
};

#endif // DialogGUI_h__

