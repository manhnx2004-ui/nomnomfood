const mongoose = require("mongoose");

const DebtSchema = new mongoose.Schema({
    type: { type: String, enum: ["receivable", "payable"], required: true },
    partner: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: Date,
    note: { type: String, default: '' },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Debt", DebtSchema);
