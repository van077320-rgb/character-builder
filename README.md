# Character & Roleplay Prompt Studio

Công cụ dựng **Character Card** và **System Prompt** hoàn chỉnh cho roleplay tiếng Việt.
Điền form → xuất ra prompt chuẩn theo template, kèm trợ lý AI (Gemini) gợi ý nội dung
và đồng bộ file lên Google Drive.

- Hỗ trợ **1–10 nhân vật** trong cùng một prompt, tự chèn `CHARACTER CONSISTENCY RULE` khi có từ 2 nhân vật trở lên
- Lịch sử lưu trong trình duyệt, sao lưu ra file JSON hoặc Google Drive
- Xoay vòng nhiều API key Gemini + tự hạ model dự phòng khi hết quota
- **Hòm thư lưu bút** ẩn danh (không cần đăng nhập) + **băng thông báo** chạy trên trang chủ

---

## Chạy trên máy

**Yêu cầu:** Node.js 20+

```bash
npm install
```

Tạo file `.env` ở thư mục gốc (xem mẫu trong [.env.example](.env.example)):

```
GEMINI_API_KEY="AIza...khoá của bạn"
```

> ⚠️ Phải là `.env`, **không phải** `.env.local` — `server.ts` gọi `dotenv.config()` không tham số nên chỉ đọc `.env`.

```bash
npm run dev
```

Mở http://localhost:3000

Cổng 3000 bị ứng dụng khác chiếm thì đổi:

```bash
PORT=3100 npm run dev
```

### Biến môi trường

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Khoá chính |
| `GEMINI_API_KEYS` | | Nhiều khoá phân tách bằng dấu phẩy, để xoay vòng chia tải RPM |
| `GEMINI_API_KEY_1` … `_10` | | Cách khai báo từng khoá riêng lẻ |
| `PORT` | | Mặc định `3000`, chỉ dùng khi chạy local |

Khai báo cả ba kiểu cũng được — hệ thống gộp lại, loại trùng và bỏ khoá sai định dạng.
Khoá bị loại được liệt kê kèm lý do trong modal trạng thái (nút con chip trên thanh tiêu đề).

**Định dạng khoá:** AI Studio phát hành cả `AIza...` (kiểu cũ) lẫn `AQ...` (kiểu mới,
là thứ nút *Create API key* trả về hiện nay) — cả hai đều dùng được. Chỉ chuỗi
`ya29...` / `Bearer ...` là OAuth access token, không phải API key.

**Muốn nhân hạn mức thì mỗi khoá phải ở một Google Cloud project khác nhau.**
Hạn mức miễn phí tính theo (project × model × ngày), nên năm khoá trong cùng một
project vẫn chia nhau đúng một suất. Trong AI Studio, chọn *Create API key in new project*.

### Lệnh khác

```bash
npm run lint     # tsc --noEmit, phải sạch trước khi deploy
npm run build    # dist/ (web tĩnh) + build/server.cjs (server Node)
npm start        # chạy bản build: node build/server.cjs
npm run clean    # xoá dist/ và build/
```

---

## Deploy lên Netlify

Cấu hình đã có sẵn trong [netlify.toml](netlify.toml), không cần chỉnh:

| | |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |

**Bắt buộc:** thêm `GEMINI_API_KEY` (và/hoặc `GEMINI_API_KEYS`) vào
**Site settings → Environment variables**. Thiếu thì mọi nút AI trả lỗi
"Không tìm thấy GEMINI_API_KEY hợp lệ".

Khoá Gemini **chỉ tồn tại ở tầng server** — không có biến nào lọt vào bundle trình duyệt.

---

## Lưu ý khi dùng

Hai điều hay làm người dùng mắc kẹt nhất. Cả hai đã được ghi trong mục
**Hướng dẫn cơ bản** ngay trang chủ của app — sửa ở đây thì nhớ sửa cả
[HeroGateway.tsx](src/components/HeroGateway.tsx) cho khớp.

**Google Drive phải cấp lại quyền mỗi lần vào trang.** Access token của Drive
không được lưu qua lần tải trang (cố ý, để không phải cất token vào
localStorage) và bản thân nó chỉ sống một tiếng. Nghĩa là mở lại tab là phải
đăng nhập / cấp quyền lại thì mới lưu lên Drive được. App có bắt trường hợp này
và hiện nút cấp lại quyền, nhưng người dùng nên kiểm tra biểu tượng Drive
**trước** khi ngồi gõ cả bản nháp.

**Bị giới hạn AI thì bấm biểu tượng con chip.** Modal trạng thái cho biết còn
bao nhiêu key dùng được, key nào đang tạm nghỉ vì lý do gì, và **còn bao lâu
nữa** thì quay lại pool. Không có nó thì người dùng chỉ biết bấm thử lại liên
tục mà không biết phải đợi đến bao giờ — mỗi lần thử lại còn đốt thêm quota.

---

## Cấu hình Firebase & Google Cloud

Thông tin project nằm trong [firebase-applet-config.json](firebase-applet-config.json).
Mọi link tới Console trong app đều **tự sinh từ `projectId` trong file này**, nên đổi
project chỉ cần sửa đúng một chỗ.

Bốn bước sau làm trên Console, theo đúng thứ tự:

1. **Firestore Database** → Create database (production mode) → tab **Rules** dán
   [firestore.rules](firestore.rules) → Publish.
   *Bỏ qua bước này thì bộ đếm khách bị 403, và tab Lưu bút báo "Không được phép đọc hòm thư".*
2. **Authentication → Sign-in method** → bật **Google**.
3. **Bật Google Drive API** cho **đúng project của Firebase** (không phải project Cloud khác).
4. **OAuth consent screen → Publish app.** App chỉ xin `drive.file` + `email`/`profile`/`openid`
   — toàn bộ là scope không nhạy cảm nên **không cần Google review**. Để ở chế độ Testing thì
   chỉ test user đăng nhập được và token chết sau 7 ngày.

Sau khi deploy, thêm domain thật vào **Authentication → Settings → Authorized domains**.
Quên bước này thì app tự báo lỗi kèm nút copy domain và link tới đúng trang.

> Khoá `apiKey` trong file cấu hình là **Firebase Web API key — công khai theo thiết kế**,
> ai mở app cũng thấy trong bundle. Thứ thực sự bảo vệ dữ liệu là Firestore Rules và
> Authorized domains, không phải việc giấu khoá này.

---

## Hòm thư lưu bút & Thông báo

**Lưu bút (thẻ `5. Lưu bút`)** — khách viết được mà không cần đăng nhập bất cứ tài khoản
nào. Bản ghi nằm ở collection `guestbook`.

Vì không có đăng nhập nên **không có `request.auth` để dựa vào**, và phần validate trong
[firestore.rules](firestore.rules) là lớp DUY NHẤT ngăn người ta nhét dữ liệu tuỳ ý vào
database: đúng ba trường `name` / `message` / `createdAt`, đúng kiểu, đúng độ dài, và
`createdAt` bắt buộc là giờ máy chủ (không cho tự khai giờ để nhảy lên đầu danh sách).
Cooldown 60 giây trong [guestbookService.ts](src/guestbookService.ts) chỉ chặn bấm nhầm
hai lần — **đừng nhầm nó là bảo mật**, xoá localStorage là qua.

> Sửa giới hạn độ dài thì phải sửa **cả hai chỗ**: `GUESTBOOK_NAME_MAX` /
> `GUESTBOOK_MESSAGE_MAX` trong service, và con số tương ứng trong Rules. Lệch nhau thì
> người viết gõ xong mới nhận một dòng "permission-denied" mà không hiểu vì sao.

**Thông báo chạy trên trang chủ** — collection `announcements`, ai cũng đọc, chỉ admin ghi.
Băng chữ tự ẩn hoàn toàn khi không có thông báo nào đang bật, kể cả lúc Firestore lỗi:
một dòng báo lỗi đỏ nằm giữa banner chào mừng chỉ làm người dùng hoang mang.

Mỗi thông báo có thể đặt **hạn tự ẩn** (`expiresAt`, cho phép `null` = chạy tới khi admin
tự tắt). Hạn được so với **đồng hồ máy người xem**, không phải giờ máy chủ — máy ai chỉnh
sai ngày thì thấy lệch, đổi lại là không tốn thêm lượt đọc Firestore chỉ để hỏi giờ.
Băng chạy tính lại mỗi phút nên thông báo hết hạn tự rụng mà không cần tải lại trang.

> Bản ghi đăng từ trước khi có tính năng này **không hề có trường `expiresAt`**. Vì vậy
> Rules đọc nó bằng `get('expiresAt', null)` — truy cập thẳng vào một khoá không tồn tại
> thì Rules coi là lỗi và chặn luôn cả thao tác hợp lệ.

### Quyền admin

Admin = **email Google nằm trong danh sách**, không phải mật khẩu giấu trong code.

| Nơi khai báo | Vai trò |
|---|---|
| [src/data/adminConfig.ts](src/data/adminConfig.ts) → `ADMIN_EMAILS` | Ẩn / hiện bảng quản trị trên giao diện |
| [firestore.rules](firestore.rules) → `isAdmin()` | **Chặn thật.** Không có dòng này thì ai cũng ghi được |

**Hai chỗ phải khớp nhau.** Sửa một bên quên bên kia sẽ ra một trong hai cảnh: admin thấy
nút nhưng bấm bị "Không được phép", hoặc người lạ thấy bảng quản trị (bấm vẫn không ghi được).
Đổi Rules xong nhớ **Publish** lại trên Console.

Cách dùng: bấm nút **Google Drive** trên thanh tiêu đề để đăng nhập bằng email admin →
mở thẻ **5. Lưu bút** → bảng quản trị hiện ở đầu trang. Ở đó đăng thông báo mới, bật/tắt
thông báo cũ, và ẩn / xoá từng lưu bút.

> "Ẩn" chỉ là ẩn khỏi giao diện — dữ liệu vẫn đọc được qua SDK vì Rules cho phép đọc công
> khai cả collection. Muốn mất hẳn thì phải **Xoá**.

---

## Cấu trúc

```
src/
  components/       Giao diện React
  data/             templateConstants.ts  ← trình biên dịch prompt
                    backupFormat.ts       ← định dạng sao lưu dùng chung
                    draftState.ts         ← nhận biết bản nháp chưa lưu
                    safeStorage.ts        ← đọc localStorage an toàn
                    googleConsole.ts      ← link Console sinh từ projectId
                    adminConfig.ts        ← email admin, PHẢI khớp firestore.rules
                    firestoreErrors.ts    ← dịch lỗi Firestore sang việc cần làm
  guestbookService.ts     ← hòm thư lưu bút (ghi được khi chưa đăng nhập)
  announcementService.ts  ← thông báo chạy trang chủ (chỉ admin ghi)
  server/           geminiRotationService.ts ← xoay key + hạ model
shared/             aiContracts.ts        ← prompt & shape response DÙNG CHUNG
                    characterFields.ts    ← 47 trường hợp lệ của thẻ nhân vật
netlify/functions/  api.ts                ← backend production
server.ts                                  ← backend khi chạy local
docs/               checklist-quet-loi-xoay-key.md ← checklist tự rà lỗi lớp xoay key
```

### Hai quy ước cần giữ

**1. Không viết prompt hay đặt tên key response ở đâu khác ngoài `shared/aiContracts.ts`.**
`server.ts` (local) và `netlify/functions/api.ts` (production) phải phục vụ **cùng một
contract**. Trước đây hai bên tự viết riêng và trôi lệch nhau, khiến các nút AI chạy tốt
khi dev nhưng im lặng không làm gì sau khi deploy — lỗi chỉ lộ ra trên production.

**2. Khối `<user_persona>` là biểu mẫu TRỐNG cho người chơi điền, không phải chỗ tác giả
khai thông tin.** Trình biên dịch chỉ ghép `nhãn: placeholder` từ các mục được tích trong
Template Builder.

---

## Bản quyền

Prompt template © **Hành tinh nhỏ của Cá Mèo**.
Giữ nguyên khối `<credit>` khi sử dụng hoặc chia sẻ prompt xuất ra từ công cụ này.
