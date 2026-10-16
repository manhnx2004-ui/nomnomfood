const TKKeToan = require("../models/accounting/TKKeToan");
const KyKeToan = require("../models/accounting/KyKeToan");
const { monthKey, countPeriodRefs } = require("./periodUtils");
const { getPeriodForDate } = require("./accountingHelpers");

const DEFAULT_ACCOUNTS = [
    { soHieuTK: "111", tenTK: "Tiền mặt", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "112", tenTK: "Tiền gửi ngân hàng", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "131", tenTK: "Phải thu khách hàng", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "1331", tenTK: "Thuế GTGT được khấu trừ", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "152", tenTK: "Nguyên vật liệu", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "153", tenTK: "Công cụ dụng cụ", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "156", tenTK: "Hàng hóa", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "211", tenTK: "Tài sản cố định hữu hình", loaiTK: "tai_san", banChat: "no" },
    { soHieuTK: "214", tenTK: "Hao mòn tài sản cố định lũy kế", loaiTK: "tai_san", banChat: "co" },
    { soHieuTK: "331", tenTK: "Phải trả người bán", loaiTK: "no_phai_tra", banChat: "co" },
    { soHieuTK: "333", tenTK: "Thuế và các khoản phải nộp Nhà nước", loaiTK: "no_phai_tra", banChat: "co" },
    { soHieuTK: "3331", tenTK: "Thuế GTGT đầu ra phải nộp", loaiTK: "no_phai_tra", banChat: "co" },
    { soHieuTK: "3335", tenTK: "Thuế thu nhập cá nhân", loaiTK: "no_phai_tra", banChat: "co" },
    { soHieuTK: "334", tenTK: "Phải trả người lao động", loaiTK: "no_phai_tra", banChat: "co" },
    { soHieuTK: "338", tenTK: "Phải trả, phải nộp khác (BHXH, BHYT, BHTN)", loaiTK: "no_phai_tra", banChat: "co" },
    { soHieuTK: "411", tenTK: "Vốn chủ sở hữu", loaiTK: "von_chu_so_huu", banChat: "co" },
    { soHieuTK: "421", tenTK: "Lợi nhuận chưa phân phối", loaiTK: "von_chu_so_huu", banChat: "co" },
    { soHieuTK: "511", tenTK: "Doanh thu bán hàng và cung cấp dịch vụ", loaiTK: "doanh_thu", banChat: "co" },
    { soHieuTK: "711", tenTK: "Thu nhập khác", loaiTK: "doanh_thu", banChat: "co" },
    { soHieuTK: "632", tenTK: "Giá vốn hàng bán", loaiTK: "chi_phi", banChat: "no" },
    { soHieuTK: "642", tenTK: "Chi phí quản lý kinh doanh", loaiTK: "chi_phi", banChat: "no" },
    { soHieuTK: "811", tenTK: "Chi phí khác", loaiTK: "chi_phi", banChat: "no" },
    { soHieuTK: "911", tenTK: "Xác định kết quả kinh doanh", loaiTK: "chi_phi", banChat: "no" },
];

async function seedAccounting() {
    const accountCount = await TKKeToan.countDocuments();
    if (accountCount === 0) {
        await TKKeToan.insertMany(DEFAULT_ACCOUNTS);
        console.log("Đã khởi tạo hệ thống tài khoản kế toán mặc định");
    } else {
        // Bổ sung tài khoản mới thêm vào danh mục mặc định
        const have = new Set((await TKKeToan.find().select("soHieuTK").lean()).map((a) => a.soHieuTK));
        const missing = DEFAULT_ACCOUNTS.filter((a) => !have.has(a.soHieuTK));
        if (missing.length) await TKKeToan.insertMany(missing);
    }

    await dedupePeriods();

    // Tạo kỳ cho tháng hiện tại nếu tháng này chưa có kỳ
    await getPeriodForDate(new Date());
}

// Gán khóa tháng cho kỳ cũ, xóa kỳ trùng tháng không có dữ liệu, rồi tạo unique index
async function dedupePeriods() {
    const db = KyKeToan.db.db;
    const periods = await KyKeToan.collection.find().toArray();

    const groups = new Map();
    for (const p of periods) {
        const key = monthKey(p.ngayBatDau);
        if (p.thang !== key) await KyKeToan.collection.updateOne({ _id: p._id }, { $set: { thang: key } });
        const refs = await countPeriodRefs(db, p._id);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ ...p, refs });
    }

    for (const [key, list] of groups) {
        if (list.length < 2) continue;
        // Giữ kỳ có nhiều dữ liệu nhất (bằng nhau thì giữ kỳ tạo sớm nhất)
        list.sort((a, b) => b.refs - a.refs || new Date(a.createdAt) - new Date(b.createdAt));
        const [keep, ...dups] = list;
        for (const d of dups) {
            if (d.refs > 0) {
                console.warn(`Kỳ kế toán "${d.tenKy}" trùng tháng ${key} với "${keep.tenKy}" nhưng có dữ liệu, cần xử lý thủ công`);
                continue;
            }
            await KyKeToan.collection.deleteOne({ _id: d._id });
            console.log(`Đã xóa kỳ kế toán trùng tháng ${key}: "${d.tenKy}" (giữ lại "${keep.tenKy}")`);
        }
    }

    try {
        await KyKeToan.syncIndexes();
    } catch (err) {
        console.warn("Chưa tạo được unique index cho kỳ kế toán:", err.message);
    }
}

module.exports = { seedAccounting };
