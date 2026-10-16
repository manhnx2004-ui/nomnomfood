require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const productRoutes = require("./routes/ProductRoutes");
const cartRoutes = require("./routes/cartRoutes");
const categoryRoutes = require("./routes/categroryRoutes");
const orderRoutes = require("./routes/OrderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const AdminRoutes  = require("./routes/AdminRoutes");
const uploadRoute  = require("./routes/uploadRoute");
const chatRoutes   = require("./routes/chatRoutes");
const couponRoutes = require("./routes/couponRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const accCoreRoutes = require("./routes/accounting/coreRoutes");
const accSalesRoutes = require("./routes/accounting/salesRoutes");
const accPurchasingRoutes = require("./routes/accounting/purchasingRoutes");
const accInventoryRoutes = require("./routes/accounting/inventoryRoutes");
const accAssetsRoutes = require("./routes/accounting/assetsRoutes");
const accPayrollRoutes = require("./routes/accounting/payrollRoutes");
const accBankRoutes = require("./routes/accounting/bankRoutes");
const orderMessageRoutes = require("./routes/orderMessageRoutes");
const { seedAccounting } = require("./services/seedAccounting");
const HuyDonHoanTien = require("./models/accounting/HuyDonHoanTien");
const { authenticate, guard, rateLimit } = require("./middleware/auth");
const seo = require("./services/seo");
const app = express();

// Cấu hình đọc từ biến môi trường (trên hosting đặt trong phần Environment; chạy máy nhà thì dùng file .env)
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nomnomfood";
// ============================
// MIDDLEWARE
// ============================
app.set("trust proxy", 1); // chạy sau proxy của hosting: lấy đúng IP khách và giao thức https
app.disable("x-powered-by");
app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "SAMEORIGIN");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});
// Chỉ bật CORS khi cần cho tên miền khác gọi API (CORS_ORIGIN=https://abc.com,https://xyz.com)
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
app.use(require("compression")()); // nén gzip phản hồi (danh sách đơn hàng, thanh toán nhẹ đi ~10 lần)
app.use(express.json({ limit: "1mb" }));

// SEO + trang tĩnh
let dbError = null; // loại lỗi kết nối gần nhất (không chứa chuỗi kết nối) — để chẩn đoán trên hosting
app.get("/healthz", (req, res) => res.json({
    ok: true,
    db: mongoose.connection.readyState === 1,
    ...(mongoose.connection.readyState !== 1 && {
        dbError,
        dbHost: /127\.0\.0\.1|localhost/.test(MONGODB_URI) ? "local (chưa đặt MONGODB_URI)" : "remote",
    }),
}));
app.get("/robots.txt", seo.robots);
app.get("/sitemap.xml", seo.sitemap);
app.use(seo.pages());
app.use(express.static("public", { maxAge: "1h" }));
app.use("/Images", express.static("Images", { maxAge: "7d" }));
app.use("/CSS", express.static("CSS", { maxAge: "1h" }));

// Giới hạn tần suất các API dễ bị lạm dụng
app.use("/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút" }));
app.use("/auth/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }));
app.use("/api/chat", rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: "Bạn đã hỏi NomBot quá nhiều, vui lòng thử lại sau ít phút" }));
app.use("/upload", rateLimit({ windowMs: 60 * 60 * 1000, max: 60 }));
app.use("/orders", rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Xác thực (đọc token) + phân quyền cho mọi API phía dưới
app.use(authenticate);
app.use(guard);
// ============================
// KẾT NỐI MONGODB
// ============================
// Lần đầu kết nối lỗi thì mongoose không tự thử lại → thử lại mỗi 15 giây
const connectDb = () => mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
    .then(async () => {
        dbError = null;
        console.log("MongoDB Connected");
        await seedAccounting();
        // Các phiếu hoàn tiền tạo trước khi có luồng "khách yêu cầu" đều đã
        // được kế toán xử lý xong (bút toán đã ghi ngay lúc tạo) — backfill
        // trạng thái để không hiện nhầm thành yêu cầu hoàn tiền mới.
        await HuyDonHoanTien.updateMany(
            { trangThai: { $exists: false } },
            { $set: { trangThai: "da_hoan_tien", daXacNhanCK: true, updatedAt: new Date() } }
        );
    })
    .catch((err) => {
        console.log("Lỗi kết nối MongoDB:", err.message);
        dbError = [err.name, err.codeName || err.code, err.reason && err.reason.type].filter(Boolean).join(" / ") || "unknown";
        if (/auth/i.test(err.message)) dbError += " (sai user/mật khẩu)";
        setTimeout(connectDb, 15000);
    });
connectDb();
// ============================
// ROUTES
// ============================
app.use(productRoutes);
app.use(cartRoutes);
app.use(categoryRoutes);
app.use(orderRoutes);
app.use(paymentRoutes);
app.use(reviewRoutes);
app.use(userRoutes);
app.use(AdminRoutes);
app.use(uploadRoute);
app.use(chatRoutes);
app.use(couponRoutes);
app.use(accountingRoutes);
app.use(accCoreRoutes);
app.use(accSalesRoutes);
app.use(accPurchasingRoutes);
app.use(accInventoryRoutes);
app.use(accAssetsRoutes);
app.use(accPayrollRoutes);
app.use(accBankRoutes);
app.use(orderMessageRoutes);
// ============================
// SERVER
// ============================
// Lỗi không lường trước: không lộ chi tiết nội bộ ra ngoài
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: err.expose ? err.message : "Lỗi hệ thống, vui lòng thử lại" });
});

app.listen(PORT, () => {
    console.log(`Server running port ${PORT}`);
});