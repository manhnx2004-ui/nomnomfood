const mongoose = require("mongoose");

const DinhMucMonAnSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    danhMucNL: { type: mongoose.Schema.Types.ObjectId, ref: "DanhMucNL", required: true },
    dinhLuong: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DinhMucMonAn", DinhMucMonAnSchema);
