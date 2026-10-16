// Ngày của kỳ kế toán tính theo giờ Việt Nam (UTC+7), dù được lưu ở 00:00 UTC
// (từ form "YYYY-MM-DD") hay 00:00 giờ địa phương (từ seed).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toVn = (date) => new Date(new Date(date).getTime() + VN_OFFSET_MS);

// "YYYY-MM" của tháng chứa ngày đó
function monthKey(date) {
    const d = toVn(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Ngày đầu (00:00) và cuối (23:59:59) của tháng "YYYY-MM" theo giờ Việt Nam
function monthRange(key) {
    const [y, m] = key.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1) - VN_OFFSET_MS);
    const end = new Date(Date.UTC(y, m, 1) - VN_OFFSET_MS - 1000);
    return { start, end, label: `Tháng ${m}/${y}` };
}

// Kỳ đã qua khi đã hết ngày kết thúc (theo giờ Việt Nam)
function isPeriodExpired(p, now = Date.now()) {
    const d = toVn(p.ngayKetThuc);
    const endOfDayVn = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - VN_OFFSET_MS;
    return endOfDayVn <= now;
}

// Các collection tham chiếu tới kỳ kế toán
const PERIOD_REF_COLLECTIONS = [
    "buttoans", "socais", "baocaotaichinhs", "bangluongs",
    "khauhaos", "thuegtgts", "congnophaitranccs", "huydonhoantiens",
];

// Tổng số bản ghi dữ liệu thuộc về kỳ kế toán
async function countPeriodRefs(db, periodId) {
    let refs = 0;
    for (const c of PERIOD_REF_COLLECTIONS) refs += await db.collection(c).countDocuments({ kyKeToan: periodId });
    return refs;
}

module.exports = { monthKey, monthRange, isPeriodExpired, countPeriodRefs, ONE_DAY_MS };
