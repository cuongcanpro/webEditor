### Hướng dẫn dev đa ngôn ngữ:

Viết tắt:

+ isoCode: iso 639-1 language code

##### Đối với DEV:

1. Mỗi module sẽ có các file Localize có tên dưới dạng `Localized_<isoCode>` đặt ở cùng folder/directory (xem các module khác để tham khảo), ví dụ: `Localized_en, Localized_vi, Localized_id, ...` Tại hàm `init` của module, gọi `LocalizedString.add(<path đến 1 trong bất kỳ các file localized kia>)`, khi đổi ngôn ngữ hệ thống sẽ tự load file localize của ngôn ngữ tương ứng
2. Khi muốn string, text trong GUI tự động được load lại khi đổi ngôn ngữ, set string/text ở trong CocosStudio đó dưới dạng `str_<LOCALIZED_KEY>` (như tongits :D)
3. Khi sử dụng CocosStudio mà ảnh có chứa text bên trong, muốn ảnh chứa trong các Button, Panel, Sprite, ..., tự thay đổi tương ứng khi thay đổi ngôn ngữ cần đặt tên ảnh dưới dạng sau: `<image_name>.<isoCode>.<image_ext>` rồi mới kéo thả vào CocosStudio, ví dụ: `btnClose.vi.png` <-> `btnClose.id.png` <-> `btnClose.en.png`, 3 ảnh trên sẽ được lựa chọn tự động khi đổi qua lại các ngôn ngữ Tiếng Việt, Tiếng Indo, Tiếng Anh
4. Khi muốn set string bằng hàm `LocalizedString.to` cho 1 Label/Text bằng code mà muốn hệ thống tự đổi string tương ứng thì phải gọi hàm `LocalizedString.setLabelString`, ví dụ: Thay vì gọi `txt.setString(LocalizedString.to('CLOSE')` ta sẽ gọi `LocalizedString.setLabelString(txt, 'CLOSE')`
5. Khi hệ thống thay đổi ngôn ngữ, hàm `onLanguageChanged(isoCode)` của `BaseLayer` sẽ được gọi (hàm này cũng sẽ được gọi cho từng node, nhưng xử lý ở `BaseLayer` là đủ :D). Các resource khác cần thay đổi khi đổi ngôn ngữ module sẽ tự xử lý ở đây, như load lại animation, load lại sound, ...

##### Đối với ART:

Các resource mà chứa text sẽ cần các bản ngôn ngữ khác nhau như:

+ Ảnh nếu có text
+ Animation nếu có text
+ ...
