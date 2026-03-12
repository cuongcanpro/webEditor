#include "DialogUI.h"
#include "cocos/ui/CocosGUI.h"
#include "update/ConfigReader.h"

using namespace cocos2d;
using namespace ui;

void DialogGUI::initUI()
{
	auto size = Director::getInstance()->getWinSize();
	_scale = size.width / 800;
	_scale = (_scale > 1) ? 1 : _scale;

	fog = LayerColor::create(Color4B(0, 0, 0, 150));
	fog->setAnchorPoint(Vec2(0.5, 0.5));
	fog->setContentSize(size);
	fog->ignoreAnchorPointForPosition(false);
	fog->setPosition(size.width/2,size.height/2);
	addChild(fog);

	bg = Sprite::create(ConfigReader::getInstance()->dialogBg);
	addChild(bg);
	bg->setPosition(size.width / 2, size.height / 2);
	bg->setScale(_scale);

	auto bSize = bg->getContentSize();

	auto title = Sprite::create(ConfigReader::getInstance()->dialogTitle);
	bg->addChild(title);
	title->setPosition(bSize.width / 2, bSize.height - title->getContentSize().height/2);

	content = Text::create("", ConfigReader::getInstance()->fontName, ConfigReader::getInstance()->fontSize);
	content->setTextVerticalAlignment(TextVAlignment::CENTER);
	content->setTextHorizontalAlignment(TextHAlignment::CENTER);
	content->setPosition(Vec2(bSize.width / 2, bSize.height / 2));
	content->setTextColor(ConfigReader::getInstance()->dialogTextColor);
	content->ignoreContentAdaptWithSize(false);
	content->setContentSize(CCSize(bSize.width*0.9f, bSize.height / 2));
	bg->addChild(content);

	btnOK = Button::create(ConfigReader::getInstance()->dialogBtnOK, ConfigReader::getInstance()->dialogBtnOK);
	btnCancel = Button::create(ConfigReader::getInstance()->dialogBtnCancel, ConfigReader::getInstance()->dialogBtnCancel);
	btnOK->setTag(0);
	btnCancel->setTag(1);
	btnOK->setPressedActionEnabled(true);
	btnCancel->setPressedActionEnabled(true);
	btnOK->addTouchEventListener(CC_CALLBACK_2(DialogGUI::onButtonEvent, this));
	btnCancel->addTouchEventListener(CC_CALLBACK_2(DialogGUI::onButtonEvent, this));
	btnOK->setVisible(false);
	btnCancel->setVisible(false);
	btnOK->setPosition(Vec2(bSize.width / 2 - btnOK->getContentSize().width/1.9f, btnOK->getContentSize().height*0.8f));
	btnCancel->setPosition(Vec2(bSize.width / 2 + btnCancel->getContentSize().width / 1.9f, btnCancel->getContentSize().height*0.8f));

	bg->addChild(btnOK);
	bg->addChild(btnCancel);

	this->setVisible(false);
}

void DialogGUI::onButtonEvent(Ref *pSender, Widget::TouchEventType type)
{
	int tag = ((Button*)pSender)->getTag();

	switch (type)
	{
	case Widget::TouchEventType::BEGAN:
		
		break;
	case Widget::TouchEventType::MOVED:
		break;
	case Widget::TouchEventType::ENDED:
		{
			this->hideDialog(tag);
			break;
		}
	case Widget::TouchEventType::CANCELED:
		break;
	default:
		break;
	}
}

void DialogGUI::showOK(std::string msg, std::function<void()> f /* = []() */)
{
	showDialog();

	content->setString(msg);

	btnCancel->setVisible(false);
	btnOK->setVisible(true);

	btnOK->setPositionX(bg->getContentSize().width / 2);

	this->fOK = f;
}

void DialogGUI::showOKCancel(std::string msg, std::function<void()> f1 /* = []() */, std::function<void()> f2 /* = []() */)
{
	showDialog();

	content->setString(msg);

	btnCancel->setVisible(true);
	btnOK->setVisible(true);

	btnOK->setPositionX(bg->getContentSize().width / 2 - btnOK->getContentSize().width / 2);
	btnCancel->setPositionX(bg->getContentSize().width / 2 + btnCancel->getContentSize().width / 2);

	this->fOK = f1;
	this->fCancel = f2;
}

void DialogGUI::showDialog()
{
	this->setVisible(true);

	bg->setScale(0);
	bg->setOpacity(0);
	fog->setOpacity(0);

	bg->runAction(Spawn::create(EaseBackOut::create(ScaleTo::create(0.35f, _scale)), FadeIn::create(0.35f) , NULL));
	fog->runAction(FadeTo::create(0.35f,150));
}

void DialogGUI::hideDialog(int tag)
{
	fog->runAction(FadeOut::create(0.2f));
	bg->setScale(_scale);
	bg->runAction(Spawn::create(EaseBackIn::create(ScaleTo::create(0.2f, 0.2f)),FadeOut::create(0.2f),NULL));

	std::function<void()> f;
	if (tag == 0)
	{
		if (fOK)
		{
			f = fOK;
		}
	}
	else
	{
		if (fCancel)
		{
			f = fCancel;
		}
	}

	runAction(Sequence::create(DelayTime::create(0.25f),CallFunc::create(f), RemoveSelf::create(), NULL));
}
