const express = require("express");
const router  = express.Router();
const Coupon  = require("../models/Coupon");
const { evaluateCoupon, CouponError } = require("../services/couponService");

// Lấy tất cả coupon
router.get("/coupons", async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tạo coupon mới
router.post("/coupons", async (req, res) => {
    try {
        const coupon = new Coupon(req.body);
        await coupon.save();
        res.status(201).json(coupon);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Cập nhật coupon
router.put("/coupons/:id", async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!coupon) return res.status(404).json({ error: "Không tìm thấy coupon" });
        res.json(coupon);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Xóa coupon
router.delete("/coupons/:id", async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return res.status(404).json({ error: "Không tìm thấy coupon" });
        res.json({ message: "Đã xóa coupon" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Kiểm tra / áp dụng coupon (dùng ở checkout)
router.post("/coupons/validate", async (req, res) => {
    try {
        const { code, orderTotal } = req.body;
        const { coupon, discount } = await evaluateCoupon(code, orderTotal);
        // Khách chỉ cần biết thông tin hiển thị, không cần dữ liệu nội bộ của mã
        const { _id, code: c, description, type, value, usedCount } = coupon.toObject();
        res.json({ valid: true, discount, coupon: { _id, code: c, description, type, value, usedCount } });
    } catch (err) {
        res.status(err instanceof CouponError ? err.status : 500).json({ error: err.message });
    }
});

module.exports = router;
