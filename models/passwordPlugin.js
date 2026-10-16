// Mật khẩu tài khoản: luôn lưu dạng băm bcrypt, không bao giờ trả ra API.
// Dùng chung cho User và Admin. Tài khoản cũ còn lưu chữ thường vẫn đăng nhập được
// và được băm lại ngay khi đăng nhập thành công.
const bcrypt = require("bcryptjs");

const ROUNDS = 10;
const isHash = (v) => typeof v === "string" && /^\$2[aby]\$\d{2}\$.{53}$/.test(v);
const hash = async (v) => (isHash(v) ? v : bcrypt.hash(String(v), ROUNDS));

module.exports = function passwordPlugin(schema) {
    const hidePassword = (doc, ret) => { delete ret.password; return ret; };
    schema.set("toJSON", { transform: hidePassword });
    schema.set("toObject", { transform: hidePassword });

    schema.pre("save", async function () {
        if (this.isModified("password") && this.password) this.password = await hash(this.password);
    });

    // Tham số của hook insertMany khác nhau giữa các phiên bản Mongoose: lấy mảng tài liệu trong các đối số
    schema.pre("insertMany", async function (...args) {
        const docs = args.find((a) => Array.isArray(a)) || args.find((a) => a && typeof a === "object" && "password" in a);
        for (const d of [].concat(docs || [])) if (d && d.password) d.password = await hash(d.password);
    });

    // findByIdAndUpdate / updateOne...: băm mật khẩu mới, bỏ qua mật khẩu rỗng (form để trống = không đổi)
    schema.pre(["findOneAndUpdate", "updateOne", "updateMany"], async function () {
        const u = this.getUpdate() || {};
        for (const target of [u, u.$set].filter(Boolean)) {
            if (!("password" in target)) continue;
            if (!target.password) delete target.password;
            else target.password = await hash(target.password);
        }
        this.setUpdate(u);
    });

    schema.methods.verifyPassword = async function (plain) {
        if (!this.password || plain === undefined || plain === null) return false;
        if (isHash(this.password)) return bcrypt.compare(String(plain), this.password);
        if (this.password !== String(plain)) return false;
        this.password = await hash(plain); // tài khoản cũ: băm lại ngay
        await this.save();
        return true;
    };
};

module.exports.isHash = isHash;
