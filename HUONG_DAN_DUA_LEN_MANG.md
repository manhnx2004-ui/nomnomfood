# Đưa NomNomFood lên mạng để khách tìm thấy trên Google

Tổng chi phí: **0đ** (MongoDB Atlas miễn phí + Render miễn phí + tên miền `*.onrender.com`).
Thời gian làm: khoảng 45–60 phút. Google bắt đầu hiện trang thường sau vài ngày đến 2–3 tuần.

```
Khách ──► Google ──► https://nomnomfood.onrender.com  (Render: chạy server.js)
                                   │
                                   ▼
                       MongoDB Atlas (dữ liệu: món, đơn, kế toán, ảnh tải lên)
```

---

## Bước 0 — Chạy thử bản mới trên máy (5 phút)

Code đã được sửa để bảo mật hơn (đăng nhập bằng token, khách không gọi được API quản trị).
Bản gốc trước khi sửa nằm trong thư mục `_backup_truoc_khi_sua/`.

1. Mở terminal trong thư mục `nomnomfood`, chạy `npm start`.
2. Vào http://localhost:3000 → **đăng nhập lại** (phiên cũ trong trình duyệt không còn dùng được).
3. Thử: khách đặt 1 đơn → bếp nhận nấu → shipper giao xong → admin xem kế toán.

---

## Bước 1 — Tạo database trên MongoDB Atlas (15 phút)

1. Vào https://www.mongodb.com/cloud/atlas/register → đăng ký (có thể dùng tài khoản Google).
2. **Create a cluster** → chọn gói **M0 (Free)** → nhà cung cấp AWS, vùng **Singapore (ap-southeast-1)** → Create.
3. **Database Access** → *Add New Database User*
   - Username: `nomnom` — Password: bấm *Autogenerate*, **chép lại mật khẩu**.
   - Quyền: *Read and write to any database*.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   (Render miễn phí không có IP cố định nên phải mở cho mọi IP; dữ liệu vẫn được bảo vệ bằng mật khẩu.)
5. **Database → Connect → Drivers** → chép chuỗi kết nối, dạng:
   `mongodb+srv://nomnom:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Sửa thành (thay mật khẩu, **thêm `/nomnomfood` trước dấu `?`**):
   `mongodb+srv://nomnom:MATKHAU@cluster0.xxxxx.mongodb.net/nomnomfood?retryWrites=true&w=majority`

### Chép dữ liệu từ máy lên Atlas

MongoDB trên máy phải đang chạy. Trong thư mục `nomnomfood`:

```
node scripts/copy-db.js "mongodb+srv://nomnom:MATKHAU@cluster0.xxxxx.mongodb.net/nomnomfood?retryWrites=true&w=majority"
```

### ⚠️ Đổi mật khẩu tài khoản mẫu (bắt buộc)

Dữ liệu mẫu có `admin@nomnomfood.vn / admin123`, khách mẫu `123456`... Ai cũng đoán được.

```
node scripts/set-password.js admin@nomnomfood.vn "MatKhauManh@2026" "CHUỖI_ATLAS"
node scripts/set-password.js manager@nomnomfood.vn "MatKhauKhac@2026" "CHUỖI_ATLAS"
node scripts/set-password.js shipper@nomnomfood.vn "MatKhauKhac2@2026" "CHUỖI_ATLAS"
```

Khách hàng mẫu (an.nguyen@gmail.com…) nên xóa trong trang Quản trị → Tài khoản trước khi bán thật.

---

## Bước 2 — Đưa code lên GitHub (10 phút)

1. Tạo tài khoản https://github.com (nếu chưa có), cài **GitHub Desktop**: https://desktop.github.com
2. GitHub Desktop → *File → Add local repository* → chọn thư mục `nomnomfood`
   → nó báo chưa phải repository → bấm **create a repository** → *Create repository*.
3. Bấm **Publish repository** → bỏ tích hoặc giữ *Keep this code private* đều được → Publish.

File `.gitignore` đã chặn `.env` (khóa API), `node_modules`, `mongodb-data` — **kiểm tra trong danh sách file của GitHub Desktop không có `.env`**.

---

## Bước 3 — Chạy web trên Render (10 phút)

### Cách nhanh: Blueprint (dùng file `render.yaml` có sẵn)

1. Vào https://render.com → *Get Started* → đăng nhập bằng GitHub.
2. **New → Blueprint** → chọn repository `nomnomfood` → Render đọc `render.yaml` và tự điền
   tên, vùng Singapore, gói Free, lệnh build/start, health check, và tự tạo `JWT_SECRET`.
3. Render hỏi các biến còn thiếu → nhập `MONGODB_URI` (chuỗi Atlas ở Bước 1), `GROQ_API_KEY`,
   `SITE_URL` (`https://nomnomfood.onrender.com`), `GOOGLE_SITE_VERIFICATION` để trống → **Apply**.
4. Đợi 2–4 phút đến khi thấy **Live** → mở `https://nomnomfood.onrender.com`.

Nếu tên `nomnomfood` đã có người dùng, Render sẽ cấp địa chỉ khác — sửa lại `SITE_URL` cho đúng địa chỉ đó
(*Environment* → sửa → *Save*).

### Cách thủ công (nếu không dùng Blueprint)

1. Vào https://render.com → *Get Started* → đăng nhập bằng GitHub.
2. **New → Web Service** → chọn repository `nomnomfood`.
3. Điền:
   | Mục | Giá trị |
   |---|---|
   | Name | `nomnomfood` (thành địa chỉ `nomnomfood.onrender.com`; nếu trùng thì thêm chữ) |
   | Region | **Singapore** |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |
4. **Environment Variables** — bấm *Add* từng dòng:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | chuỗi Atlas ở Bước 1 |
   | `JWT_SECRET` | một chuỗi ngẫu nhiên dài (bấm *Generate* nếu Render có nút này) |
   | `GROQ_API_KEY` | khóa Groq của chatbot (copy từ file `.env` trên máy) |
   | `SITE_URL` | `https://nomnomfood.onrender.com` (đúng địa chỉ Render cấp) |
   | `NODE_ENV` | `production` |
5. *Advanced → Health Check Path*: `/healthz` → **Create Web Service**.
6. Đợi 2–4 phút đến khi thấy **Live** → mở `https://nomnomfood.onrender.com`.

Lần sau sửa code: GitHub Desktop → *Commit* → *Push* → Render tự cập nhật.

**Lưu ý gói Free:** không có ai truy cập 15 phút thì server ngủ, khách vào lần đầu phải đợi ~1 phút.
Khi bán thật nên nâng lên gói trả phí rẻ nhất của Render (vài USD/tháng) để web luôn chạy nhanh.

---

## Bước 4 — Đăng ký với Google (10 phút)

1. Vào https://search.google.com/search-console → *Add property* → chọn **URL prefix** → nhập `https://nomnomfood.onrender.com`.
2. Chọn cách xác minh **HTML tag** → Google đưa dòng
   `<meta name="google-site-verification" content="AbC123...">` → chỉ chép phần `AbC123...`.
3. Render → *Environment* → thêm `GOOGLE_SITE_VERIFICATION` = `AbC123...` → *Save* (web tự khởi động lại, đợi Live).
4. Quay lại Search Console → **Verify**.
5. Menu **Sitemaps** → nhập `sitemap.xml` → *Submit*.
6. Menu **URL Inspection** → dán `https://nomnomfood.onrender.com/` → **Request indexing**.

Kiểm tra sau vài ngày: gõ `site:nomnomfood.onrender.com` trên Google.

### Để khách tìm thấy dễ hơn
- Khách gõ đúng tên **"NomNomFood"** sẽ thấy sớm nhất. Từ khóa chung như "đặt đồ ăn" cạnh tranh với GrabFood/ShopeeFood nên rất khó lên đầu.
- Nếu quán có địa chỉ thật: tạo **Google Business Profile** (https://business.google.com) — hiện trên Google Maps và mục "quán gần đây", hiệu quả nhất cho quán ăn.
- Chia sẻ link lên Facebook/Zalo: web đã có ảnh xem trước + mô tả cho từng món.
- Tên miền riêng (`nomnomfood.vn`) uy tín hơn; mua sau cũng được, Render cho gắn thêm.

---

## Đã sửa gì trong code

| Vấn đề trước đây | Bây giờ |
|---|---|
| Ai cũng gọi được mọi API (xem/xóa người dùng, sửa món, xem sổ sách kế toán) | Đăng nhập cấp token; mỗi API kiểm tra quyền: khách / bếp / shipper / admin |
| Đăng ký gửi `role: "admin"` là thành admin | Đăng ký luôn là khách hàng |
| Khách tự đặt giá món / tổng tiền đơn | Server tự tính giá từ database, mã giảm giá kiểm tra ở server |
| Khách xem được đơn, giỏ hàng, hồ sơ người khác | Chỉ xem của chính mình |
| Địa chỉ API cứng `http://localhost:3000` | Tự dùng tên miền đang chạy |
| Ảnh tải lên lưu thành file → mất khi Render khởi động lại | Lưu trong MongoDB |
| Không giới hạn đăng nhập sai | Khóa 15 phút sau 20 lần sai / IP |
| Không có SEO | robots.txt, sitemap.xml, mô tả, ảnh xem trước, dữ liệu cấu trúc cho từng món |

## Còn cần lưu ý khi bán thật
- **Chuyển khoản / MoMo chưa nối cổng thanh toán**: khách tự bấm "đã chuyển". Nhân viên phải kiểm tra tài khoản ngân hàng trước khi nấu.
- **Thủ tục**: web bán hàng ở Việt Nam cần thông báo với Bộ Công Thương tại http://online.gov.vn. Nên kiểm tra quy định hiện hành.
- **Sao lưu**: gói Atlas Free không tự sao lưu. Định kỳ chạy `copy-db.js` ngược về máy (đặt `SOURCE_URI` = chuỗi Atlas, đích = MongoDB máy).
