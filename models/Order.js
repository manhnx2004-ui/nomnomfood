const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
});

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [OrderItemSchema],
    shippingAddress: {
        receiverName: String,
        receiverPhone: String,
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
    },
    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "confirmed", "preparing", "delivering", "shipping", "completed", "cancelled"],
        default: "pending",
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
    },
    note: { type: String, default: '' },
    revenuePosted: { type: Boolean, default: false },
    xuatKho: { type: mongoose.Schema.Types.ObjectId, ref: "PhieuXuatNL", default: null }, // phiếu xuất NL khi bếp nhận nấu
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Các truy vấn thường dùng: theo trạng thái (bếp, shipper), theo khách hàng, theo thời gian
OrderSchema.index({ status: 1, updatedAt: -1 });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
