const mongoose = require("mongoose");
const { monthKey } = require("../../services/periodUtils");

const KyKeToanSchema = new mongoose.Schema({
    tenKy: { type: String, required: true },
    ngayBatDau: { type: Date, required: true },
    ngayKetThuc: { type: Date, required: true },
    // Khóa tháng "YYYY-MM": mỗi tháng chỉ có duy nhất một kỳ kế toán
    thang: { type: String, required: true, unique: true },
    trangThai: { type: String, enum: ["mo", "dong"], default: "mo" },
    createdAt: { type: Date, default: Date.now },
});

KyKeToanSchema.pre("validate", function () {
    if (this.ngayBatDau) this.thang = monthKey(this.ngayBatDau);
});

module.exports = mongoose.model("KyKeToan", KyKeToanSchema);
