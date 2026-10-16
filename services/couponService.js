// Kiểm tra mã giảm giá và tính tiền giảm — dùng chung cho /coupons/validate và lúc tạo đơn.
const Coupon = require("../models/Coupon");

class CouponError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}

async function evaluateCoupon(code, orderTotal) {
    if (!code || typeof code !== "string") throw new CouponError("Vui lòng nhập mã giảm giá");
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) throw new CouponError("Mã giảm giá không hợp lệ", 404);
    if (!coupon.isActive) throw new CouponError("Mã giảm giá đã bị vô hiệu hóa");
    if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new CouponError("Mã giảm giá đã hết hạn");
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new CouponError("Mã giảm giá đã dùng hết lượt");
    const total = Number(orderTotal) || 0;
    if (total < coupon.minOrder) throw new CouponError(`Đơn hàng tối thiểu ${coupon.minOrder.toLocaleString("vi-VN")}đ`);

    let discount = 0;
    if (coupon.type === "percent") {
        discount = Math.round(total * coupon.value / 100);
        if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    } else {
        discount = coupon.value;
    }
    discount = Math.max(0, Math.min(discount, total));
    return { coupon, discount };
}

// Tăng lượt dùng một cách nguyên tử: chỉ tăng nếu còn lượt (tránh 2 đơn cùng lúc vượt giới hạn)
async function consumeCoupon(coupon) {
    const filter = { _id: coupon._id };
    if (coupon.usageLimit > 0) filter.usedCount = { $lt: coupon.usageLimit };
    const res = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
    if (!res.modifiedCount) throw new CouponError("Mã giảm giá đã dùng hết lượt");
}

module.exports = { evaluateCoupon, consumeCoupon, CouponError };
