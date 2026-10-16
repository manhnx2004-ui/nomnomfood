// Xác thực & phân quyền cho toàn bộ API.
//
// - authenticate: đọc header "Authorization: Bearer <token>", tải tài khoản từ DB → req.account
// - guard: đối chiếu (method, đường dẫn) với bảng RULES bên dưới. Đường dẫn nào không có
//   trong bảng thì CHỈ admin được gọi (mặc định đóng — thêm API mới mà quên khai báo vẫn an toàn).
//
// Vai trò:
//   khách chưa đăng nhập  → chỉ xem món, danh mục, đánh giá, đăng ký/đăng nhập, chatbot
//   customer              → giỏ hàng, đặt đơn, đơn của mình, hồ sơ của mình, đánh giá
//   shipper / manager     → xem & cập nhật trạng thái đơn (manager thêm định mức nguyên liệu)
//   admin                 → toàn quyền (trang quản trị + kế toán)
const mongoose = require("mongoose");
const { verifyToken } = require("../services/authToken");
const User = require("../models/user");
const Admin = require("../models/Admin");
const Order = require("../models/Order");

const STAFF_ROLES = ["admin", "manager", "shipper"];

async function authenticate(req, res, next) {
    req.account = null;
    const header = req.get("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return next();

    const data = verifyToken(match[1].trim());
    if (!data || !mongoose.isValidObjectId(data.sub)) {
        return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại" });
    }
    try {
        const Model = data.k === "a" ? Admin : User;
        const acc = await Model.findById(data.sub).lean();
        if (!acc) return res.status(401).json({ error: "Tài khoản không còn tồn tại, vui lòng đăng nhập lại" });
        if (acc.isLocked) return res.status(403).json({ error: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
        req.account = {
            _id: String(acc._id),
            kind: data.k,
            role: acc.role || (data.k === "a" ? "admin" : "customer"),
            name: acc.name,
            email: acc.email,
        };
        next();
    } catch (err) {
        next(err);
    }
}

// ----- tiện ích dùng trong route -----
const isAdmin = (req) => req.account?.role === "admin";
const isStaff = (req) => !!req.account && STAFF_ROLES.includes(req.account.role);
const isSelf = (req, id) => !!req.account && String(id) === req.account._id;

// Khách chỉ được xem đơn của chính mình; nhân viên xem mọi đơn
async function canAccessOrder(req, orderId) {
    if (isStaff(req)) return true;
    if (!req.account || !mongoose.isValidObjectId(orderId)) return false;
    const order = await Order.findById(orderId).select("user").lean();
    return !!order && String(order.user) === req.account._id;
}

// ----- bảng phân quyền -----
// access: "public" | "auth" (đăng nhập bất kỳ) | mảng vai trò | hàm (req, match) => boolean/Promise
const PUBLIC = "public";
const AUTH = "auth";
const ADMIN = ["admin"];
const KITCHEN = ["admin", "manager"];
const STAFF = STAFF_ROLES;

const RULES = [
    // Công khai
    ["POST", /^\/auth\/(login|register)$/, PUBLIC],
    ["GET", /^\/products(\/.*)?$/, PUBLIC],
    ["GET", /^\/categories(\/[^/]+)?$/, PUBLIC],
    ["GET", /^\/reviews\/product\/[^/]+$/, PUBLIC],
    ["GET", /^\/acc\/bank-accounts\/public$/, PUBLIC],   // số tài khoản để khách chuyển khoản
    ["POST", /^\/api\/chat$/, PUBLIC],                  // chatbot (đã giới hạn tần suất)
    ["POST", /^\/coupons\/validate$/, PUBLIC],
    ["GET", /^\/uploads\/[^/]+$/, PUBLIC],               // ảnh món / avatar
    ["GET", /^\/(robots\.txt|sitemap\.xml|healthz)$/, PUBLIC],

    // Hồ sơ cá nhân: chính chủ hoặc admin
    ["GET", /^\/users\/([^/]+)$/, (req, m) => isSelf(req, m[1]) || isAdmin(req)],
    ["PUT", /^\/users\/([^/]+)$/, (req, m) => isSelf(req, m[1]) || isAdmin(req)],

    // Giỏ hàng: chỉ giỏ của chính mình
    ["*", /^\/cart\/([^/]+)(\/[^/]+)?$/, (req, m) => isSelf(req, m[1]) || isAdmin(req)],
    ["POST", /^\/cart$/, AUTH],

    // Đơn hàng
    ["POST", /^\/orders$/, AUTH],
    ["GET", /^\/orders$/, AUTH],                                  // khách: route tự lọc chỉ đơn của mình
    ["POST", /^\/orders\/([^/]+)\/cancel-request$/, AUTH],        // route kiểm tra chính chủ
    ["*", /^\/orders\/([^/]+)\/messages$/, (req, m) => canAccessOrder(req, m[1])],
    ["GET", /^\/orders\/([^/]+)$/, (req, m) => canAccessOrder(req, m[1])],
    ["PUT", /^\/orders\/([^/]+)$/, STAFF],                        // bếp nhận đơn, shipper giao xong...
    ["GET", /^\/acc\/refunds$/, (req) => isAdmin(req) || (!!req.query.order && canAccessOrder(req, req.query.order))],

    // Thanh toán: khách tạo giao dịch cho đơn của mình (route tự tính số tiền)
    ["POST", /^\/payments$/, AUTH],

    // Đánh giá
    ["POST", /^\/reviews$/, AUTH],
    ["GET", /^\/reviews\/user\/([^/]+)$/, (req, m) => isSelf(req, m[1]) || isAdmin(req)],

    // Tải ảnh
    ["POST", /^\/upload\/(avatar|chat-image)$/, AUTH],
    ["POST", /^\/upload\/product-image$/, ADMIN],

    // Bếp: định mức nguyên liệu cho món
    ["GET", /^\/acc\/materials$/, KITCHEN],
    ["*", /^\/acc\/recipes(\/[^/]+)?$/, KITCHEN],
];

async function guard(req, res, next) {
    try {
        const path = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
        let access = ADMIN; // mặc định: chỉ admin
        let match = null;
        for (const [method, re, rule] of RULES) {
            if (method !== "*" && method !== req.method) continue;
            const m = path.match(re);
            if (m) { access = rule; match = m; break; }
        }

        // File tĩnh không tồn tại (ảnh, css...) → để Express trả 404 bình thường
        if (!match && req.method === "GET" && /\.[a-z0-9]{2,5}$/i.test(path)) return next();
        if (access === PUBLIC) return next();
        if (!req.account) return res.status(401).json({ error: "Vui lòng đăng nhập" });
        if (access === AUTH) return next();

        const ok = Array.isArray(access)
            ? access.includes(req.account.role)
            : await access(req, match);
        if (ok) return next();
        return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });
    } catch (err) {
        next(err);
    }
}

// ----- giới hạn tần suất (chống dò mật khẩu, spam chatbot) -----
// Bộ nhớ trong tiến trình: đủ cho 1 server. Mỗi IP được `max` lần trong `windowMs`.
function rateLimit({ windowMs, max, message }) {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    }, Math.min(windowMs, 60_000)).unref();

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip;
        let entry = hits.get(key);
        if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(key, entry); }
        entry.count++;
        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
            return res.status(429).json({ error: message || "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" });
        }
        next();
    };
}

module.exports = { authenticate, guard, rateLimit, isAdmin, isStaff, isSelf, canAccessOrder };
