const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    type:        { type: String, enum: ["percent", "fixed"], required: true },
    value:       { type: Number, required: true, min: 0 },
    minOrder:    { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    usageLimit:  { type: Number, default: 0 },
    usedCount:   { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
    expiresAt:   { type: Date, default: null },
    createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model("Coupon", CouponSchema);
