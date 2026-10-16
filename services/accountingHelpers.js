const KyKeToan = require("../models/accounting/KyKeToan");
const TKKeToan = require("../models/accounting/TKKeToan");
const { monthKey, monthRange } = require("./periodUtils");

// Kỳ kế toán của tháng chứa ngày phát sinh nghiệp vụ; tự tạo nếu tháng đó chưa có kỳ
// để dữ liệu bán hàng luôn được ghi vào đúng kỳ của nó
async function getPeriodForDate(date = new Date()) {
    const thang = monthKey(date);
    const { start, end, label } = monthRange(thang);
    return KyKeToan.findOneAndUpdate(
        { thang },
        { $setOnInsert: { thang, tenKy: label, ngayBatDau: start, ngayKetThuc: end, trangThai: "mo", createdAt: new Date() } },
        { upsert: true, returnDocument: "after" }
    );
}

// Kỳ của tháng hiện tại (dùng khi ghi sổ tự động lúc phát sinh nghiệp vụ)
async function getOpenPeriod() {
    return getPeriodForDate(new Date());
}

async function getAccountByCode(soHieuTK) {
    return TKKeToan.findOne({ soHieuTK });
}

const TRANSACTION_CATEGORY_ACCOUNTS = {
    "Nhập hàng": "632",
    "Lương nhân viên": "642",
    "Thuê mặt bằng": "642",
    "Điện nước": "642",
    "Marketing": "642",
    "Doanh thu khác": "711",
};

async function resolveTransactionCounterAccount(type, category) {
    const code = type === "thu"
        ? (TRANSACTION_CATEGORY_ACCOUNTS[category] || "711")
        : (TRANSACTION_CATEGORY_ACCOUNTS[category] || "811");
    return getAccountByCode(code);
}

module.exports = { getOpenPeriod, getPeriodForDate, getAccountByCode, resolveTransactionCounterAccount };
