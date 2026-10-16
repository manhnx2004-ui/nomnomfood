# 🍜 NomNomFood — Ứng dụng đặt đồ ăn trực tuyến

> Đặt đồ ăn ngon, giao tận nơi — Nhanh chóng, tiện lợi, an toàn.

---

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Tài khoản mẫu](#tài-khoản-mẫu)
- [API Endpoints](#api-endpoints)
- [Ảnh chụp màn hình](#ảnh-chụp-màn-hình)

---

## 🌟 Giới thiệu

**NomNomFood** là ứng dụng web đặt đồ ăn trực tuyến được xây dựng bằng Node.js + Express ở phía backend và HTML/CSS/JavaScript thuần ở phía frontend. Người dùng có thể duyệt thực đơn, thêm vào giỏ hàng, thanh toán và theo dõi đơn hàng. Quản trị viên có bảng điều khiển riêng để quản lý sản phẩm, danh mục và đơn hàng.

---

## ✨ Tính năng

### Người dùng

- 🔐 Đăng ký / Đăng nhập tài khoản
- 🍽️ Duyệt thực đơn theo danh mục
- 🔍 Tìm kiếm món ăn
- 🛒 Giỏ hàng (thêm, xóa, cập nhật số lượng)
- 💳 Thanh toán (COD / MoMo / Chuyển khoản)
- 📦 Xem lịch sử & trạng thái đơn hàng
- 👤 Quản lý hồ sơ & địa chỉ giao hàng mặc định
- ⭐ Đánh giá & nhận xét sản phẩm
- 💬 BossChat — hỗ trợ trực tuyến 24/7

### Quản trị viên

- 📊 Dashboard tổng quan (thống kê sản phẩm, danh mục, đơn hàng)
- 🍔 Quản lý sản phẩm (thêm / sửa / xóa, tìm kiếm)
- 🏷️ Quản lý danh mục (thêm / sửa / xóa)
- 📋 Quản lý đơn hàng (cập nhật trạng thái)

---

## 🛠️ Công nghệ sử dụng

| Layer            | Công nghệ                       |
| ---------------- | ------------------------------- |
| **Backend**      | Node.js, Express.js             |
| **Database**     | MongoDB, Mongoose ODM           |
| **Frontend**     | HTML5, CSS3, Vanilla JavaScript |
| **UI Framework** | Bootstrap 5.3.7                 |
| **Icons**        | Font Awesome 6.5.1              |
| **Auth**         | LocalStorage (JWT-free)         |

---

## 📁 Cấu trúc thư mục

```
nomnomfood/
├── server.js               # Entry point — Express server (port 3000)
├── seed.js                 # Seed dữ liệu mẫu vào MongoDB
├── package.json
│
├── models/                 # Mongoose schemas
│   ├── User.js
│   ├── Admin.js
│   ├── Product.js
│   ├── category.js
│   ├── Cart.js
│   ├── Order.js
│   ├── Payment.js
│   └── Review.js
│
├── routes/                 # Express routers
│   ├── userRoutes.js       # Auth (login/register) + user CRUD
│   ├── AdminRoutes.js
│   ├── ProductRoutes.js
│   ├── categroryRoutes.js
│   ├── cartRoutes.js
│   ├── OrderRoutes.js
│   ├── paymentRoutes.js
│   └── reviewRoutes.js
│
├── public/                 # Static files (served tại /)
│   ├── index.html          # Trang chủ
│   ├── product.html        # Thực đơn
│   ├── product-detail.html # Chi tiết sản phẩm
│   ├── cart.html           # Giỏ hàng
│   ├── checkout.html       # Thanh toán
│   ├── orders.html         # Đơn hàng
│   ├── profile.html        # Tài khoản
│   ├── login.html          # Đăng nhập
│   ├── dki.html            # Đăng ký
│   ├── admin.html          # Bảng quản trị
│   ├── about.html
│   └── JAVASCRIPT/
│       ├── auth.js         # Auth helpers + navbar + toast (dùng mọi trang)
│       ├── bosschat.js     # Widget chat hỗ trợ
│       ├── index.js
│       ├── product.js
│       ├── product-detail.js
│       ├── cart.js
│       ├── checkout.js
│       ├── orders.js
│       ├── profile.js
│       ├── login.js
│       ├── register.js
│       └── admin.js
│
├── CSS/                    # Stylesheets (served tại /CSS/)
│   ├── site.css
│   ├── footer.css
│   └── HomePage.css
│
└── Images/                 # Ảnh (served tại /Images/)
    ├── Logo.png
    ├── bogo.avif
    ├── piza.png
    ├── susi.png
    ├── garan.png
    ├── lau.png
    ├── doannhe.png
    ├── Products/
    └── RecommendProduct/
        ├── Rec1.webp … Rec5.webp
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) đang chạy ở `localhost:27017`

### Các bước

```bash
# 1. Clone hoặc tải project
cd c:\xampp\htdocs\nomnomfood

# 2. Cài dependencies
npm install

# 3. Seed dữ liệu mẫu (chạy 1 lần)
node seed.js

# 4. Khởi động server
node server.js
```

Mở trình duyệt tại **http://localhost:3000**

---

## 👥 Tài khoản mẫu

| Vai trò     | Email                 | Mật khẩu   |
| ----------- | --------------------- | ---------- |
| **Admin**   | admin@nomnomfood.vn   | admin123   |
| **Manager** | manager@nomnomfood.vn | manager123 |
| **User**    | an.nguyen@gmail.com   | 123456     |

> Tài khoản Admin/Manager sẽ thấy nút **Quản trị** trên navbar sau khi đăng nhập.

---

## 📡 API Endpoints

### Auth & User

| Method | URL              | Mô tả                    |
| ------ | ---------------- | ------------------------ |
| POST   | `/auth/register` | Đăng ký tài khoản        |
| POST   | `/auth/login`    | Đăng nhập (user + admin) |
| GET    | `/users/:id`     | Lấy thông tin user       |
| PUT    | `/users/:id`     | Cập nhật hồ sơ           |

### Sản phẩm

| Method | URL             | Mô tả              |
| ------ | --------------- | ------------------ |
| GET    | `/products`     | Danh sách sản phẩm |
| GET    | `/products/:id` | Chi tiết sản phẩm  |
| POST   | `/products`     | Thêm sản phẩm      |
| PUT    | `/products/:id` | Cập nhật sản phẩm  |
| DELETE | `/products/:id` | Xóa sản phẩm       |

### Danh mục

| Method | URL               | Mô tả              |
| ------ | ----------------- | ------------------ |
| GET    | `/categories`     | Danh sách danh mục |
| POST   | `/categories`     | Thêm danh mục      |
| PUT    | `/categories/:id` | Cập nhật danh mục  |
| DELETE | `/categories/:id` | Xóa danh mục       |

### Giỏ hàng

| Method | URL                        | Mô tả                 |
| ------ | -------------------------- | --------------------- |
| GET    | `/cart/:userId`            | Lấy giỏ hàng          |
| POST   | `/cart`                    | Thêm vào giỏ          |
| PUT    | `/cart/:userId/:productId` | Cập nhật số lượng     |
| DELETE | `/cart/:userId/:productId` | Xóa sản phẩm khỏi giỏ |

### Đơn hàng

| Method | URL                  | Mô tả               |
| ------ | -------------------- | ------------------- |
| GET    | `/orders`            | Tất cả đơn hàng     |
| GET    | `/orders?userId=xxx` | Đơn hàng của user   |
| POST   | `/orders`            | Tạo đơn hàng        |
| PUT    | `/orders/:id`        | Cập nhật trạng thái |

### Đánh giá

| Method | URL                    | Mô tả                 |
| ------ | ---------------------- | --------------------- |
| GET    | `/reviews/product/:id` | Đánh giá của sản phẩm |
| POST   | `/reviews`             | Gửi đánh giá          |

---

## 🗺️ Luồng sử dụng

```
Khách → Duyệt thực đơn (product.html)
      → Xem chi tiết (product-detail.html)
      → Thêm vào giỏ → Giỏ hàng (cart.html)
      → Thanh toán (checkout.html)
      → Theo dõi đơn (orders.html)

Admin → Đăng nhập → admin.html
      → Quản lý sản phẩm / danh mục / đơn hàng
```

---

## 📝 Ghi chú phát triển

- Mật khẩu được lưu **plain text** — nên thêm `bcrypt` khi deploy thực tế
- Auth dùng **localStorage**, không có JWT/session — phù hợp demo/học tập
- Thêm `.env` để quản lý `MONGODB_URI`, `PORT` khi deploy production

---

## 👨‍💻 Nhóm phát triển

> NomNomFood — Đồ án môn học Web Development  
> © 2025 NomNomFood. All rights reserved.
