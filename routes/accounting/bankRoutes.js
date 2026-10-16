const express = require("express");
const router = express.Router();
const TaiKhoanNganHang = require("../../models/accounting/TaiKhoanNganHang");

router.get("/acc/bank-accounts", async (req, res) => {
    try {
        const accounts = await TaiKhoanNganHang.find().sort({ isDefault: -1, createdAt: -1 });
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/bank-accounts/public", async (req, res) => {
    try {
        const accounts = await TaiKhoanNganHang.find({ active: true })
            .select("nganHangCode tenNganHang soTaiKhoan chuTaiKhoan chiNhanh isDefault")
            .sort({ isDefault: -1, createdAt: -1 });
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/bank-accounts", async (req, res) => {
    try {
        const account = new TaiKhoanNganHang(req.body);
        if (account.isDefault) {
            await TaiKhoanNganHang.updateMany({}, { isDefault: false });
        }
        await account.save();
        res.status(201).json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/acc/bank-accounts/:id", async (req, res) => {
    try {
        if (req.body.isDefault) {
            await TaiKhoanNganHang.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
        }
        const account = await TaiKhoanNganHang.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản ngân hàng" });
        res.json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/bank-accounts/:id", async (req, res) => {
    try {
        const account = await TaiKhoanNganHang.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản ngân hàng" });
        res.json({ message: "Đã xóa tài khoản ngân hàng" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
