// Ảnh người dùng tải lên (ảnh món, avatar, ảnh chat) lưu thẳng trong MongoDB.
// Lý do: hosting miễn phí (Render...) xóa sạch ổ đĩa mỗi lần khởi động lại, ảnh lưu thành file sẽ mất.
const mongoose = require("mongoose");

const UploadSchema = new mongoose.Schema({
    kind: { type: String, enum: ["product", "avatar", "chat"], required: true },
    contentType: { type: String, required: true },
    size: Number,
    data: { type: Buffer, required: true },
    owner: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Upload", UploadSchema);
