const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ["thu", "chi"], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
