const express = require("express");
const router = express.Router();
const OrderMessage = require("../models/OrderMessage");
const { isStaff } = require("../middleware/auth");

router.get("/orders/:id/messages", async (req, res) => {
    try {
        const messages = await OrderMessage.find({ order: req.params.id }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/orders/:id/messages", async (req, res) => {
    try {
        const { text, imageUrl } = req.body;
        // Người gửi xác định theo tài khoản đăng nhập, không theo dữ liệu trình duyệt gửi lên
        const sender = isStaff(req) ? "accounting" : "customer";
        const trimmed = (text || "").trim();
        if (!sender || (!trimmed && !imageUrl)) {
            return res.status(400).json({ error: "Thiếu người gửi hoặc nội dung" });
        }
        const message = new OrderMessage({ order: req.params.id, sender, text: trimmed.slice(0, 2000), imageUrl: typeof imageUrl === "string" && /^\/(uploads|Images)\//.test(imageUrl) ? imageUrl : null });
        await message.save();
        res.status(201).json(message);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
