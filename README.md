# Character & Roleplay Prompt Studio

Công cụ dựng **Character Card** và **System Prompt** hoàn chỉnh cho roleplay tiếng Việt.
Điền form → xuất ra prompt chuẩn theo template, kèm trợ lý AI (Gemini) gợi ý nội dung
và đồng bộ file lên Google Drive.

- Hỗ trợ **1–10 nhân vật** trong cùng một prompt, tự chèn `CHARACTER CONSISTENCY RULE` khi có từ 2 nhân vật trở lên
- Lịch sử lưu trong trình duyệt, sao lưu ra file JSON hoặc Google Drive
- Xoay vòng nhiều API key Gemini + tự hạ model dự phòng khi hết quota

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

## Cấu hình Firebase & Google Cloud

Thông tin project nằm trong [firebase-applet-config.json](firebase-applet-config.json).
Mọi link tới Console trong app đều **tự sinh từ `projectId` trong file này**, nên đổi
project chỉ cần sửa đúng một chỗ.

Bốn bước sau làm trên Console, theo đúng thứ tự:

1. **Firestore Database** → Create database (production mode) → tab **Rules** dán
   [firestore.rules](firestore.rules) → Publish.
   *Bỏ qua bước này thì bộ đếm khách bị 403.*
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

## Cấu trúc

```
src/
  components/       Giao diện React
  data/             templateConstants.ts  ← trình biên dịch prompt
                    backupFormat.ts       ← định dạng sao lưu dùng chung
                    draftState.ts         ← nhận biết bản nháp chưa lưu
                    safeStorage.ts        ← đọc localStorage an toàn
                    googleConsole.ts      ← link Console sinh từ projectId
  server/           geminiRotationService.ts ← xoay key + hạ model
shared/             aiContracts.ts        ← prompt & shape response DÙNG CHUNG
                    characterFields.ts    ← 47 trường hợp lệ của thẻ nhân vật
netlify/functions/  api.ts                ← backend production
server.ts                                  ← backend khi chạy local
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
