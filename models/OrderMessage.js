const mongoose = require("mongoose");

const OrderMessageSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    sender: { type: String, enum: ["customer", "accounting"], required: true },
    text: { type: String, default: "" },
    imageUrl: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("OrderMessage", OrderMessageSchema);
