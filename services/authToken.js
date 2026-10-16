// Token đăng nhập ký bằng HMAC-SHA256 (cùng ý tưởng với JWT, không cần thêm thư viện).
// Token = base64url(payload).base64url(chữ ký). Server giữ bí mật JWT_SECRET; ai sửa payload
// (đổi id, đổi quyền) thì chữ ký không khớp và token bị từ chối.
const crypto = require("crypto");

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 ngày

let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
    SECRET = crypto.randomBytes(32).toString("hex");
    if (process.env.NODE_ENV === "production") {
        console.warn("[CẢNH BÁO] Chưa đặt JWT_SECRET: mọi người sẽ bị đăng xuất mỗi khi server khởi động lại.");
    }
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

// kind: "u" = collection users (khách hàng), "a" = collection admins (admin / quản lý bếp / shipper)
function createToken(account, kind) {
    const payload = b64(JSON.stringify({
        sub: String(account._id),
        k: kind,
        exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    }));
    return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
    if (typeof token !== "string" || token.length > 1000) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!data.sub || !["u", "a"].includes(data.k)) return null;
        if (!data.exp || data.exp < Date.now() / 1000) return null;
        return data;
    } catch {
        return null;
    }
}

module.exports = { createToken, verifyToken };
