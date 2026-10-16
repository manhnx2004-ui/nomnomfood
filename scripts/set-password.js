// Đổi mật khẩu một tài khoản (khách hàng hoặc admin / bếp / shipper).
//
//   node scripts/set-password.js admin@nomnomfood.vn "MatKhauMoi@2026" "mongodb+srv://...mongodb.net/nomnomfood"
//
// Bỏ tham số thứ 3 thì đổi trên MongoDB của máy này.
const mongoose = require("mongoose");
const User = require("../models/user");
const Admin = require("../models/Admin");

const [email, password, uri] = process.argv.slice(2);

(async () => {
    if (!email || !password) {
        console.log('Cách dùng: node scripts/set-password.js <email> "<mật khẩu mới>" ["<chuỗi kết nối>"]');
        process.exit(1);
    }
    if (password.length < 8) {
        console.log("Mật khẩu nên có ít nhất 8 ký tự.");
        process.exit(1);
    }
    await mongoose.connect(uri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nomnomfood");
    const acc = (await Admin.findOne({ email })) || (await User.findOne({ email }));
    if (!acc) {
        console.log(`Không tìm thấy tài khoản ${email}`);
        process.exit(1);
    }
    acc.password = password; // tự băm bcrypt khi lưu
    await acc.save();
    console.log(`Đã đổi mật khẩu cho ${email} (${acc.role}).`);
    await mongoose.disconnect();
})().catch((err) => {
    console.error("Lỗi:", err.message);
    process.exit(1);
});
