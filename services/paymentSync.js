// Đồng bộ giao dịch thanh toán (Payment) theo trạng thái của đơn hàng, để danh sách
// thanh toán luôn khớp với đơn hàng và sổ sách kế toán.
const Payment = require("../models/Payment");

const STATUSES = ["pending", "success", "failed", "refunded"];

// Trạng thái thanh toán suy ra từ đơn hàng
function statusFromOrder(order) {
    if (order.paymentStatus === "refunded") return "refunded";
    if (order.status === "completed" || order.paymentStatus === "paid") return "success";
    if (order.status === "cancelled" || order.paymentStatus === "failed") return "failed";
    return "pending";
}

// Chuẩn hóa trạng thái gửi lên từ client (checkout cũ gửi "paid")
function normalizeStatus(status) {
    if (status === "paid") return "success";
    return STATUSES.includes(status) ? status : "pending";
}

// Tạo hoặc cập nhật giao dịch thanh toán của một đơn hàng.
// `method` chỉ dùng khi phải tạo mới (đơn chưa có giao dịch nào).
async function syncPaymentForOrder(order, { method, at } = {}) {
    if (!order) return null;
    const status = statusFromOrder(order);
    const when = at || new Date();
    const payment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });

    if (!payment) {
        return Payment.create({
            order: order._id,
            user: order.user,
            amount: order.totalPrice,
            method: method || "other",
            status,
            paidAt: status === "success" ? when : undefined,
            createdAt: order.createdAt || when,
        });
    }

    if (payment.status === status && payment.amount === order.totalPrice) return payment;
    payment.status = status;
    payment.amount = order.totalPrice;
    if (status === "success" && !payment.paidAt) payment.paidAt = when;
    await payment.save();
    return payment;
}

module.exports = { statusFromOrder, normalizeStatus, syncPaymentForOrder };
