const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: {
        type: String,
        enum: ["cash", "card", "bank_transfer", "momo", "other"],
        default: "cash",
    },
    status: {
        type: String,
        enum: ["pending", "success", "failed", "refunded"],
        default: "pending",
    },
    transactionId: String,
    paidAt: Date,
    createdAt: { type: Date, default: Date.now },
});

PaymentSchema.index({ order: 1, createdAt: -1 });
PaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);
