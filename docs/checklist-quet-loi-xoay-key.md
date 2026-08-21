# Checklist quét lỗi: lớp xoay vòng API key + model dự phòng

Rút ra từ những lỗi có thật đã tìm được trong project này. Mang sang bất kỳ
project nào có cấu trúc tương tự — một lớp server giữ nhiều API key, xoay vòng
round-robin, và hạ dần model khi lỗi.

Cách dùng nhanh: mở project kia bằng Claude Code rồi dán nguyên file này vào,
kèm câu *"quét hộ tôi từng mục, mục nào không áp dụng thì nói không áp dụng"*.

---

## A. Vòng đọc key từ biến môi trường

**A1. Bộ lọc định dạng đoán mò theo tiền tố.**
Tìm hàm kiểu `isValidKeyFormat` / `sanitizeKey`, xem nó chặn theo `startsWith`
những gì. Nhà cung cấp đổi định dạng khoá là bộ lọc quay ra chặn khoá thật —
đúng lỗi đã xảy ra ở đây: `AQ.` bị coi là access token trong khi AI Studio đang
phát hành chính định dạng ấy cho nút *Create API key*.
Nguyên tắc: chỉ chặn thứ **chắc chắn sai** (`ya29.`, `Bearer `, chuỗi giữ chỗ),
đừng dựng allowlist tiền tố cho thứ mình không kiểm soát.

**A2. Giá trị bị loại có được báo ra không?**
Nếu key sai định dạng bị `filter()` lặng lẽ thì người cấu hình 5 khoá mà hệ
thống chỉ thấy 2 sẽ không có manh mối nào. Mỗi lần loại phải ghi được **tên
biến môi trường + lý do**, và đẩy lên endpoint trạng thái.

**A3. Khử trùng lặp im lặng.**
`if (!keys.includes(k))` là đúng, nhưng phải báo biến nào bị bỏ vì trùng.

**A4. Danh sách tên biến được hỗ trợ có khớp tài liệu không?**
Kiểm tra cả ba kiểu khai báo (`X`, `X_1..N`, `X` phân tách bằng dấu phẩy) và đối
chiếu với README/`.env.example`. Sai một gạch dưới là khoá biến mất.

**A5. Sắp xếp lại thứ tự khoá.**
Nếu code `sort()` danh sách khoá, số thứ tự hiện trong log/UI sẽ lệch với biến
môi trường, làm việc đối chiếu khi debug thành đánh đố. Chỉ sắp xếp khi có lý do
thật, và ghi rõ lý do đó.

---

## B. Đơn vị của hạn mức — chỗ sai nhiều nhất

**B1. Quota tính theo cái gì?**
Đọc nguyên văn `quotaId` trong lỗi 429 thay vì đoán. Gemini free tier là
`GenerateRequestsPerDayPerProjectPerModel` — tức theo **(project × model ×
ngày)**, không theo khoá. Hệ quả: nhiều khoá trong cùng một Google Cloud project
dùng chung một suất, thêm khoá không tăng được gì.
Kiểm tra xem code, thông báo lỗi và tài liệu có nói đúng đơn vị này không, hay
vẫn đang ngầm hiểu "1 khoá = 1 suất".

**B2. Trạng thái loại trừ có đúng phạm vi không?** ⚠️ *lỗi nặng nhất ở đây*
Tìm biến kiểu `spentKeys` / `deadKeys` / `usedKeys`. Hỏi: khoá bị đánh dấu hỏng
**cho riêng model hiện tại hay cho cả lần gọi?**
Nếu 429 đánh dấu toàn cục thì khi mọi khoá cạn quota ở tier 1, vòng lặp thoát
ngay và **toàn bộ model dự phòng không bao giờ được gọi** — cả hệ thống fallback
thành đồ trang trí. Dấu hiệu nhận biết trong số liệu: `modelDowngrades` luôn
bằng 0 trong khi `rateLimitHits` cao.
Phân biệt cho đúng: 401/403/khoá sai → hỏng ở mức khoá, bỏ với mọi model.
429 → hỏng ở mức *(khoá, model)*, model khác vẫn dùng được.

**B3. Thời hạn cách ly có khớp chu kỳ hồi phục không?**
Hạn mức theo **phút** (RPM) thì nghỉ ~1 phút là hợp lý. Hạn mức theo **ngày** mà
cũng nghỉ 1 phút thì cứ mỗi phút lại đốt một request để nhận đúng cái 429 cũ.
Phân biệt bằng chính chuỗi `PerDay` / `PerMinute` trong lỗi trả về.

---

## C. Cách ly và trạng thái

**C1. Cách ly vĩnh viễn.**
`disabledKeys.add(key)` không có đường quay lại là một cú 403 thoáng qua giết
khoá đến hết đời process — trên serverless, container sống hàng chục phút.
Cách ly phải **có thời hạn** và tự hết hạn.

**C2. Cách ly hết sạch thì sao?**
Nếu mọi khoá đều đang nghỉ, hàm lấy khoá trả về mảng rỗng là app đứng hình.
Hoặc trả về danh sách đầy đủ để thử lại, hoặc báo lỗi kèm **thời gian chờ còn
lại** — đừng ném ra lỗi chung chung.

**C3. Không gọi được lần nào.**
Trường hợp mọi cặp (khoá, model) đều đang bị cách ly: không có attempt nào để
phân loại, nhánh gom lỗi cuối hàm sẽ rơi vào `unknown` và báo sai. Phải có nhánh
riêng.

**C4. Trạng thái in-memory trên serverless.** ⚠️ *chưa xử lý trong project này*
Biến module-level (`currentKeyIndex`, `Map` cách ly, `stats`) chỉ sống trong một
container. Netlify/Lambda chạy nhiều container song song và tái tạo liên tục:
round-robin không thật sự chia đều, cách ly không lan sang container khác, số
liệu thống kê là của riêng một instance. Chấp nhận được cho app nhỏ, nhưng phải
**biết** là mình đang chấp nhận, và đừng đọc số liệu như thể nó là toàn cục.

---

## D. Phân loại lỗi và thông báo

**D1. Gộp bừa mã lỗi.**
Kiểm tra hàm phân loại: 500 (lỗi máy chủ) có bị nhét chung nhóm với 429 (hết
quota) không? 404 (model không tồn tại) có bị đổ cho khoá không? Gộp sai dẫn
thẳng tới D2.

**D2. Thông báo cuối cùng có nói đúng nguyên nhân không?**
Câu "tất cả API key đều đã đạt giới hạn" cho **mọi** kiểu thất bại là cái bẫy
đắt tiền: người dùng đi mua thêm khoá trong khi vấn đề là khoá sai, là Google
lỗi 500, hoặc là tên model viết sai. Gom số lần theo từng loại lỗi, lấy loại
chiếm đa số, và **kèm nguyên văn lỗi gốc** để còn debug.

**D3. Con số trong thông báo là con số nào?**
Ở đây `"Tất cả 2 API Key..."` đếm khoá *còn dùng được sau khi lọc cách ly*,
nhưng người đọc hiểu là *số khoá đã cấu hình* — hai con số lệch nhau và không ai
biết. Luôn phân biệt rõ `totalConfigured` với `usableNow`, và hiển thị dạng
`x/y` khi chúng khác nhau.

**D4. Dò lỗi bằng cách tìm chuỗi ký tự.**
`error.message.includes("Limit:")` sẽ vỡ ngay khi câu chữ đổi. Dùng mã lỗi đã
phân loại (`error.kind`), đừng dò chuỗi tiếng Anh của nhà cung cấp.

---

## E. Trần số lần thử

**E1. Bão retry.**
Không có trần thì một lỗi 500 thoáng qua kéo theo đủ (số khoá × số model) lần
gọi cho một cú bấm nút. Lỗi *không phải của khoá* (500/503/unknown) phải có trần
riêng và dừng sớm.

**E2. Lỗi của chính request.**
400 vì prompt/schema sai thì mọi khoá, mọi model đều hỏng như nhau — phải dừng
ngay từ lần đầu, đừng đốt cả pool.

**E3. Thành công rỗng.**
API trả 200 nhưng body không parse được thành dữ liệu mong muốn là **thất bại**,
không phải thành công. Kiểm tra có nhánh nào `return res.json({})` lặng lẽ không.

---

## F. Endpoint trạng thái và UI

**F1. Nuốt lỗi HTTP.**
`fetch(...).then(r => r.json()).catch(() => null)` mà không xét `res.ok` thì
server trả 404/500 sẽ hiện thành số 0 đẹp đẽ trên giao diện, không ai biết
endpoint đang hỏng. Phải phân biệt *"không có khoá"* với *"không hỏi được"*.

**F2. Mọi trạng thái ẩn phải có đường nhìn thấy.**
Khoá đang nghỉ, khoá bị loại, khoá trùng, model đang dùng — nếu chỉ nằm trong
`console.warn` của server thì trên production coi như không tồn tại.

**F3. React key trùng.**
Khi danh sách chuyển từ *theo khoá* sang *theo cặp (khoá, model)*, `key={masked}`
sẽ trùng. Ghép thêm chiều mới vào.

---

## G. Cấu hình phía Netlify (không nằm trong code)

- **Scope** của biến môi trường: để *All scopes*. Chỉ chọn *Builds* thì
  serverless function không đọc được.
- **Deploy context**: biến đặt riêng cho Production sẽ không có ở deploy preview
  / branch deploy.
- **Redeploy**: thêm hoặc sửa biến xong phải deploy lại thì function mới nhận.
- Giá trị dán vào có **dấu nháy hoặc khoảng trắng thừa** không — `.trim()` cứu
  được khoảng trắng, không cứu được dấu nháy.

---

## Câu lệnh grep mở màn

```bash
grep -rnE "startsWith\(['\"](AIza|AQ|ya29|sk-|Bearer)" src/
grep -rnE "spentKeys|deadKeys|disabledKeys|usedKeys|blacklist" src/
grep -rnE "429|rate.?limit|quota|RESOURCE_EXHAUSTED" src/
grep -rnE "\.includes\(['\"](Limit|Quota|quota)" src/
grep -rn "catch (() => null)\|catch(() => null)" src/
```
