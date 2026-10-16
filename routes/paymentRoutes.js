const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const KyKeToan = require("../models/accounting/KyKeToan");
const { normalizeStatus } = require("../services/paymentSync");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { isStaff } = require("../middleware/auth");

const METHODS = ["cash", "card", "bank_transfer", "momo", "other"];

router.post("/payments", async (req, res) => {
  try {
    // Khách hàng: giao dịch chỉ gắn với đơn của chính mình, số tiền lấy theo đơn
    if (!isStaff(req)) {
      const order = mongoose.isValidObjectId(req.body.order) ? await Order.findById(req.body.order).lean() : null;
      if (!order || String(order.user) !== req.account._id) return res.status(403).json({ error: "Không tìm thấy đơn hàng của bạn" });
      if (await Payment.exists({ order: order._id })) return res.status(409).json({ error: "Đơn hàng đã có giao dịch thanh toán" });
      const payment = await Payment.create({
        order: order._id,
        user: req.account._id,
        amount: order.totalPrice,
        method: METHODS.includes(req.body.method) ? req.body.method : "cash",
        status: order.paymentStatus === "paid" ? "success" : "pending",
        paidAt: order.paymentStatus === "paid" ? new Date() : undefined,
      });
      return res.status(201).json(payment);
    }

    const status = normalizeStatus(req.body.status);
    const payment = new Payment({
      ...req.body,
      status,
      paidAt: req.body.paidAt || (status === "success" ? new Date() : undefined),
    });
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ?period=<id> để chỉ lấy các giao dịch phát sinh trong kỳ kế toán đó
router.get("/payments", async (req, res) => {
  try {
    const filter = {};
    if (req.query.period) {
      const period = await KyKeToan.findById(req.query.period);
      if (!period) return res.status(404).json({ error: "Không tìm thấy kỳ kế toán" });
      filter.createdAt = { $gte: period.ngayBatDau, $lte: period.ngayKetThuc };
    }
    const payments = await Payment.find(filter)
      .populate({ path: "order", select: "_id status paymentStatus totalPrice createdAt shippingAddress" })
      .populate({ path: "user", select: "name email phone" })
      .sort({ createdAt: -1 }).lean();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/payments/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("order user");
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/payments/:id", async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status !== undefined) update.status = normalizeStatus(update.status);
    const payment = await Payment.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/payments/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
