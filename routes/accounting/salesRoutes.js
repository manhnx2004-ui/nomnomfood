const express = require("express");
const router = express.Router();
const HoaDonBanHang = require("../../models/accounting/HoaDonBanHang");
const HuyDonHoanTien = require("../../models/accounting/HuyDonHoanTien");
const Online = require("../../models/accounting/Online");
const Order = require("../../models/Order");
const journalService = require("../../services/journalService");
const { getOpenPeriod, getAccountByCode } = require("../../services/accountingHelpers");
const { syncPaymentForOrder } = require("../../services/paymentSync");
const vatService = require("../../services/vatService");

// ==================== Hóa đơn bán hàng ====================
router.get("/acc/sales-invoices", async (req, res) => {
    try {
        const invoices = await HoaDonBanHang.find().populate("order").sort({ ngayLap: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/sales-invoices/:id", async (req, res) => {
    try {
        const invoice = await HoaDonBanHang.findById(req.params.id).populate("order");
        if (!invoice) return res.status(404).json({ error: "Không tìm thấy hóa đơn" });
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Hủy đơn / hoàn tiền ====================

async function postRefundButToan(order, lyDo, soTienHoan) {
    const period = await getOpenPeriod();
    const tk111 = await getAccountByCode("111");
    const tk511 = await getAccountByCode("511");
    if (period && tk111 && tk511 && order.revenuePosted) {
        const entry = await journalService.postButToan({
            kyKeToan: period._id,
            noiDung: `Hoàn tiền đơn hàng #${order._id}: ${lyDo || ""}`,
            tkNo: tk511._id,
            tkCo: tk111._id,
            soTien: soTienHoan,
            nguon: "hoan_tien",
            nguonId: order._id,
        });
        return entry._id;
    }
    return null;
}

router.get("/acc/refunds", async (req, res) => {
    try {
        const filter = {};
        if (req.query.order) filter.order = req.query.order;
        const refunds = await HuyDonHoanTien.find(filter)
            .populate({ path: "order", populate: { path: "user" } })
            .populate("butToan")
            .sort({ createdAt: -1 });
        res.json(refunds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/refunds", async (req, res) => {
    try {
        const { order: orderId, lyDo, soTienHoan } = req.body;
        if (!orderId || !soTienHoan) return res.status(400).json({ error: "Thiếu đơn hàng hoặc số tiền hoàn" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

        const refund = new HuyDonHoanTien({
            order: orderId,
            lyDo,
            soTienHoan,
            trangThai: "da_hoan_tien",
            daXacNhanCK: true,
        });
        refund.butToan = await postRefundButToan(order, lyDo, soTienHoan);

        await refund.save();
        // Hoàn toàn bộ tiền thì đơn và giao dịch thanh toán chuyển sang "đã hoàn tiền"
        if (Number(soTienHoan) >= order.totalPrice) {
            order.paymentStatus = "refunded";
            await order.save();
            await syncPaymentForOrder(order);
        }
        res.status(201).json(refund);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Khách tự hủy đơn (bếp chưa xác nhận) + yêu cầu hoàn tiền
router.post("/orders/:id/cancel-request", async (req, res) => {
    try {
        const { lyDo } = req.body;
        const userId = req.account._id; // chỉ chính chủ đơn hàng được hủy
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
        if (!userId || order.user.toString() !== userId) {
            return res.status(403).json({ error: "Bạn không có quyền hủy đơn hàng này" });
        }
        if (order.status !== "pending") {
            return res.status(400).json({ error: "Đơn hàng đã được bếp xác nhận, không thể tự hủy" });
        }
        if (order.paymentStatus !== "paid") {
            return res.status(400).json({ error: "Đơn hàng chưa thanh toán online, vui lòng liên hệ hotline để hủy" });
        }

        order.status = "cancelled"; order.updatedAt = new Date();
        order.note = `[HỦY] ${lyDo || "Khách hàng yêu cầu hủy đơn và hoàn tiền"}`;
        await order.save();
        await syncPaymentForOrder(order);

        const refund = new HuyDonHoanTien({
            order: order._id,
            lyDo: lyDo || "Khách hàng yêu cầu hủy đơn và hoàn tiền",
            soTienHoan: order.totalPrice,
            trangThai: "yeu_cau",
            nguoiYeuCau: userId,
        });
        await refund.save();

        res.status(201).json(refund);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Kế toán xác nhận đã nhận được chuyển khoản của khách
router.put("/acc/refunds/:id/confirm-transfer", async (req, res) => {
    try {
        const refund = await HuyDonHoanTien.findById(req.params.id);
        if (!refund) return res.status(404).json({ error: "Không tìm thấy yêu cầu hoàn tiền" });
        if (refund.trangThai !== "yeu_cau") {
            return res.status(400).json({ error: "Yêu cầu này đã được xử lý" });
        }
        refund.daXacNhanCK = true;
        refund.trangThai = "da_kiem_tra";
        refund.updatedAt = new Date();
        await refund.save();
        res.json(refund);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Kế toán thực hiện hoàn tiền (chỉ khi đã xác nhận chuyển khoản)
router.put("/acc/refunds/:id/process", async (req, res) => {
    try {
        const refund = await HuyDonHoanTien.findById(req.params.id);
        if (!refund) return res.status(404).json({ error: "Không tìm thấy yêu cầu hoàn tiền" });
        if (!refund.daXacNhanCK) {
            return res.status(400).json({ error: "Cần xác nhận đã nhận chuyển khoản trước khi hoàn tiền" });
        }
        if (refund.trangThai === "da_hoan_tien") {
            return res.status(400).json({ error: "Yêu cầu này đã được hoàn tiền" });
        }

        const order = await Order.findById(refund.order);
        if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

        refund.butToan = await postRefundButToan(order, refund.lyDo, refund.soTienHoan);
        refund.trangThai = "da_hoan_tien";
        refund.updatedAt = new Date();
        await refund.save();

        order.paymentStatus = "refunded";
        await order.save();
        await syncPaymentForOrder(order);

        res.json(refund);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Kế toán từ chối yêu cầu hoàn tiền
router.put("/acc/refunds/:id/reject", async (req, res) => {
    try {
        const refund = await HuyDonHoanTien.findById(req.params.id);
        if (!refund) return res.status(404).json({ error: "Không tìm thấy yêu cầu hoàn tiền" });
        if (refund.trangThai === "da_hoan_tien") {
            return res.status(400).json({ error: "Yêu cầu này đã được hoàn tiền" });
        }
        refund.trangThai = "tu_choi";
        refund.updatedAt = new Date();
        await refund.save();
        res.json(refund);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Kênh bán hàng ====================
router.get("/acc/channels", async (req, res) => {
    try {
        const channels = await Online.find().sort({ tenKenh: 1 });
        res.json(channels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/channels", async (req, res) => {
    try {
        const channel = new Online(req.body);
        await channel.save();
        res.status(201).json(channel);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/channels/:id", async (req, res) => {
    try {
        const channel = await Online.findByIdAndDelete(req.params.id);
        if (!channel) return res.status(404).json({ error: "Không tìm thấy kênh bán hàng" });
        res.json({ message: "Đã xóa kênh bán hàng" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Thuế GTGT ====================
// Tờ khai thuế GTGT của kỳ kèm chi tiết hóa đơn đầu vào, doanh thu bán ra, bút toán thuế
router.get("/acc/vat", async (req, res) => {
    try {
        const { period } = req.query;
        if (!period) return res.status(400).json({ error: "Thiếu kỳ kế toán" });
        res.json(await vatService.getVatDetail(period));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sửa thiết lập tờ khai: thuế suất đầu ra, điều chỉnh tăng/giảm, ghi chú
router.put("/acc/vat/:period", async (req, res) => {
    try {
        await vatService.updateSettings(req.params.period, req.body);
        res.json(await vatService.getVatDetail(req.params.period));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const vatAction = (fn) => async (req, res) => {
    try {
        await fn(req.params.period, req.body || {});
        res.json(await vatService.getVatDetail(req.params.period));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
router.post("/acc/vat/:period/close", vatAction(vatService.closeVat));
router.post("/acc/vat/:period/pay", vatAction(vatService.recordPayment));
router.post("/acc/vat/:period/reopen", vatAction(vatService.reopenVat));

// Sửa thuế GTGT đầu vào của một hóa đơn mua hàng
router.put("/acc/purchase-invoices/:id/vat", async (req, res) => {
    try {
        res.json(await vatService.updatePurchaseInvoiceVat(req.params.id, req.body.thueGtgtDauVao));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
