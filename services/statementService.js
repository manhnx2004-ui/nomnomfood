// Báo cáo tài chính theo mẫu rút gọn của chế độ kế toán doanh nghiệp nhỏ và vừa:
// - Bảng cân đối kế toán (B01): số dư LŨY KẾ đến đầu kỳ và cuối kỳ (tài khoản tài sản,
//   nợ phải trả, vốn được chuyển tiếp qua các kỳ; lợi nhuận các kỳ được dồn vào 421).
// - Báo cáo kết quả kinh doanh (B02): phát sinh trong kỳ và lũy kế từ đầu năm.
const KyKeToan = require("../models/accounting/KyKeToan");
const TKKeToan = require("../models/accounting/TKKeToan");
const ButToan = require("../models/accounting/ButToan");
const BaoCaoTaiChinh = require("../models/accounting/BaoCaoTaiChinh");

const PHIEN_BAN = 4;

// Tổng phát sinh Nợ/Có của từng tài khoản trong các kỳ đã cho
async function phatSinh(periodIds) {
    const result = new Map();
    if (!periodIds.length) return result;
    const add = (rows, side) => {
        for (const r of rows) {
            const key = String(r._id);
            const v = result.get(key) || { no: 0, co: 0 };
            v[side] += r.total;
            result.set(key, v);
        }
    };
    const [noRows, coRows] = await Promise.all([
        ButToan.aggregate([{ $match: { kyKeToan: { $in: periodIds } } }, { $group: { _id: "$tkNo", total: { $sum: "$soTien" } } }]),
        ButToan.aggregate([{ $match: { kyKeToan: { $in: periodIds } } }, { $group: { _id: "$tkCo", total: { $sum: "$soTien" } } }]),
    ]);
    add(noRows, "no");
    add(coRows, "co");
    // Thuế GTGT đầu ra được tách khỏi doanh thu khi chốt tờ khai (Nợ 511 / Có 3331)
    const [vat] = await ButToan.aggregate([
        { $match: { kyKeToan: { $in: periodIds }, nguon: "thue" } },
        { $lookup: { from: "tkketoans", localField: "tkNo", foreignField: "_id", as: "no" } },
        { $match: { "no.soHieuTK": "511" } },
        { $group: { _id: null, total: { $sum: "$soTien" } } },
    ]);
    result.vatSplit = vat ? vat.total : 0;
    return result;
}

// Bộ tra cứu theo số hiệu tài khoản trên một tập phát sinh
function makeLookup(accounts, ps) {
    const byCode = new Map(accounts.map((a) => [a.soHieuTK, a]));
    const get = (code) => {
        const a = byCode.get(code);
        return (a && ps.get(String(a._id))) || { no: 0, co: 0 };
    };
    return {
        no: (code) => get(code).no,
        co: (code) => get(code).co,
        // Số dư theo bản chất của tài khoản
        soDu: (code) => {
            const a = byCode.get(code);
            if (!a) return 0;
            const v = get(code);
            return a.banChat === "no" ? v.no - v.co : v.co - v.no;
        },
    };
}

async function loadContext(kyKeToanId) {
    const period = await KyKeToan.findById(kyKeToanId).lean();
    if (!period) throw new Error("Không tìm thấy kỳ kế toán");
    const [accounts, allPeriods] = await Promise.all([
        TKKeToan.find().lean(),
        KyKeToan.find().sort({ ngayBatDau: 1 }).lean(),
    ]);
    return { period, accounts, allPeriods };
}

// ==================== Báo cáo kết quả kinh doanh ====================
function tinhKetQua(accounts, ps) {
    const L = makeLookup(accounts, ps);
    const sumCodes = (prefixes, fn) => accounts
        .filter((a) => prefixes.some((p) => a.soHieuTK.startsWith(p)))
        .reduce((s, a) => s + fn(a.soHieuTK), 0);

    // Doanh thu chưa gồm thuế GTGT; giảm trừ chỉ gồm hoàn tiền / giảm giá ghi Nợ 511
    const vatSplit = ps.vatSplit || 0;
    const doanhThu = L.co("511") - vatSplit;
    const giamTru = L.no("511") - vatSplit;
    const doanhThuThuan = doanhThu - giamTru;
    const giaVon = L.soDu("632");
    const loiNhuanGop = doanhThuThuan - giaVon;
    const dtTaiChinh = L.soDu("515");
    const cpTaiChinh = L.soDu("635");
    const cpQuanLy = sumCodes(["641", "642"], L.soDu);
    const lnThuan = loiNhuanGop + dtTaiChinh - cpTaiChinh - cpQuanLy;
    const thuNhapKhac = L.soDu("711");
    const chiPhiKhac = L.soDu("811");
    const lnKhac = thuNhapKhac - chiPhiKhac;
    const lnTruocThue = lnThuan + lnKhac;
    const thueTNDN = L.soDu("821");
    const lnSauThue = lnTruocThue - thueTNDN;

    return {
        doanhThu, giamTru, doanhThuThuan, giaVon, loiNhuanGop, dtTaiChinh, cpTaiChinh,
        cpQuanLy, lnThuan, thuNhapKhac, chiPhiKhac, lnKhac, lnTruocThue, thueTNDN, lnSauThue,
    };
}

const DONG_KET_QUA = [
    ["01", "Doanh thu bán hàng và cung cấp dịch vụ", "doanhThu", "Có 511 (chưa gồm GTGT)"],
    ["02", "Các khoản giảm trừ doanh thu (hoàn tiền)", "giamTru", "Nợ 511"],
    ["10", "Doanh thu thuần về bán hàng và cung cấp dịch vụ", "doanhThuThuan", "01 − 02", true],
    ["11", "Giá vốn hàng bán", "giaVon", "632"],
    ["20", "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ", "loiNhuanGop", "10 − 11", true],
    ["21", "Doanh thu hoạt động tài chính", "dtTaiChinh", "515"],
    ["22", "Chi phí tài chính", "cpTaiChinh", "635"],
    ["24", "Chi phí quản lý kinh doanh", "cpQuanLy", "642"],
    ["30", "Lợi nhuận thuần từ hoạt động kinh doanh", "lnThuan", "20 + 21 − 22 − 24", true],
    ["31", "Thu nhập khác", "thuNhapKhac", "711"],
    ["32", "Chi phí khác", "chiPhiKhac", "811"],
    ["40", "Lợi nhuận khác", "lnKhac", "31 − 32", true],
    ["50", "Tổng lợi nhuận kế toán trước thuế", "lnTruocThue", "30 + 40", true],
    ["51", "Chi phí thuế thu nhập doanh nghiệp", "thueTNDN", "821"],
    ["60", "Lợi nhuận sau thuế thu nhập doanh nghiệp", "lnSauThue", "50 − 51", true],
];

async function generateIncomeStatement(kyKeToanId) {
    const { period, accounts, allPeriods } = await loadContext(kyKeToanId);
    const year = new Date(period.ngayBatDau).getFullYear();
    const yearToDateIds = allPeriods
        .filter((p) => new Date(p.ngayBatDau) <= new Date(period.ngayBatDau) && new Date(p.ngayBatDau).getFullYear() === year)
        .map((p) => p._id);

    const kyNay = tinhKetQua(accounts, await phatSinh([period._id]));
    const luyKe = tinhKetQua(accounts, await phatSinh(yearToDateIds));

    const duLieu = {
        phienBan: PHIEN_BAN,
        tenKy: period.tenKy,
        luyKeTu: `Từ đầu năm ${year}`,
        dong: DONG_KET_QUA.map(([ma, ten, key, cachTinh, tong]) => ({
            ma, ten, cachTinh, tong: !!tong, kyNay: kyNay[key], luyKe: luyKe[key],
        })),
        // Số tóm tắt
        tongDoanhThu: kyNay.doanhThuThuan + kyNay.dtTaiChinh + kyNay.thuNhapKhac,
        tongChiPhi: kyNay.giaVon + kyNay.cpTaiChinh + kyNay.cpQuanLy + kyNay.chiPhiKhac + kyNay.thueTNDN,
        loiNhuan: kyNay.lnSauThue,
        loiNhuanLuyKe: luyKe.lnSauThue,
    };

    return BaoCaoTaiChinh.findOneAndUpdate(
        { kyKeToan: kyKeToanId, loaiBaoCao: "ket_qua_kinh_doanh" },
        { duLieu, ngayLap: new Date() },
        { upsert: true, returnDocument: "after" }
    );
}

// ==================== Bảng cân đối kế toán ====================
// Mỗi dòng gom một hoặc nhiều tài khoản; tài khoản không có trong danh sách
// nhưng có số dư sẽ được thêm vào nhóm phù hợp theo loại tài khoản.
const CAU_TRUC_CAN_DOI = [
    { ma: "A", ten: "TÀI SẢN NGẮN HẠN", phia: "taiSan", dong: [
        { ten: "Tiền và các khoản tương đương tiền", tk: ["111", "112"] },
        { ten: "Phải thu của khách hàng", tk: ["131"] },
        { ten: "Thuế GTGT được khấu trừ", tk: ["1331"] },
        { ten: "Hàng tồn kho", tk: ["152", "153", "156"] },
    ] },
    { ma: "B", ten: "TÀI SẢN DÀI HẠN", phia: "taiSan", dong: [
        { ten: "Nguyên giá tài sản cố định", tk: ["211"] },
        { ten: "Giá trị hao mòn lũy kế", tk: ["214"], giamTru: true },
    ] },
    { ma: "C", ten: "NỢ PHẢI TRẢ", phia: "nguonVon", dong: [
        { ten: "Phải trả người bán", tk: ["331"] },
        { ten: "Thuế và các khoản phải nộp Nhà nước", tk: ["333", "3331", "3335"] },
        { ten: "Phải trả người lao động", tk: ["334"] },
        { ten: "Phải trả, phải nộp khác (bảo hiểm)", tk: ["338"] },
    ] },
    { ma: "D", ten: "VỐN CHỦ SỞ HỮU", phia: "nguonVon", dong: [
        { ten: "Vốn góp của chủ sở hữu", tk: ["411"] },
        { ten: "Lợi nhuận sau thuế chưa phân phối", tk: ["421"], loiNhuan: true },
    ] },
];

function tinhCanDoi(accounts, ps) {
    const L = makeLookup(accounts, ps);
    // Lợi nhuận lũy kế chưa kết chuyển (doanh thu − chi phí của mọi kỳ tính tới thời điểm này)
    const kq = tinhKetQua(accounts, ps);

    const used = new Set(CAU_TRUC_CAN_DOI.flatMap((s) => s.dong.flatMap((d) => d.tk)));
    const extraGroup = { tai_san: "A", no_phai_tra: "C", von_chu_so_huu: "D" };

    return CAU_TRUC_CAN_DOI.map((section) => {
        const dong = section.dong.map((d) => {
            let soTien = d.tk.reduce((s, code) => s + L.soDu(code), 0);
            if (d.giamTru) soTien = -soTien;
            if (d.loiNhuan) soTien += kq.lnSauThue;
            return { ten: d.ten, tk: d.tk.join(", "), soTien, giamTru: !!d.giamTru };
        });
        for (const a of accounts) {
            if (used.has(a.soHieuTK) || extraGroup[a.loaiTK] !== section.ma) continue;
            const soTien = L.soDu(a.soHieuTK);
            if (soTien) dong.push({ ten: a.tenTK, tk: a.soHieuTK, soTien: section.phia === "taiSan" && a.banChat === "co" ? -soTien : soTien });
        }
        return { ma: section.ma, ten: section.ten, phia: section.phia, dong, tong: dong.reduce((s, d) => s + d.soTien, 0) };
    });
}

async function generateBalanceSheet(kyKeToanId) {
    const { period, accounts, allPeriods } = await loadContext(kyKeToanId);
    const start = new Date(period.ngayBatDau);
    const truocKy = allPeriods.filter((p) => new Date(p.ngayBatDau) < start).map((p) => p._id);
    const denCuoiKy = allPeriods.filter((p) => new Date(p.ngayBatDau) <= start).map((p) => p._id);

    const dauKy = tinhCanDoi(accounts, await phatSinh(truocKy));
    const cuoiKy = tinhCanDoi(accounts, await phatSinh(denCuoiKy));

    // Ghép hai thời điểm theo từng dòng
    const sections = cuoiKy.map((sec, i) => {
        const dauSec = dauKy[i];
        const dong = sec.dong.map((d) => {
            const match = dauSec.dong.find((x) => x.tk === d.tk && x.ten === d.ten);
            return { ...d, cuoiKy: d.soTien, dauKy: match ? match.soTien : 0 };
        });
        for (const d of dauSec.dong) {
            if (!dong.some((x) => x.tk === d.tk && x.ten === d.ten)) dong.push({ ...d, cuoiKy: 0, dauKy: d.soTien });
        }
        return { ma: sec.ma, ten: sec.ten, phia: sec.phia, dong: dong.map(({ soTien, ...rest }) => rest), tong: { dauKy: dauSec.tong, cuoiKy: sec.tong } };
    });

    const total = (phia, key) => sections.filter((s) => s.phia === phia).reduce((s, x) => s + x.tong[key], 0);
    const tongTaiSan = { dauKy: total("taiSan", "dauKy"), cuoiKy: total("taiSan", "cuoiKy") };
    const tongNguonVon = { dauKy: total("nguonVon", "dauKy"), cuoiKy: total("nguonVon", "cuoiKy") };

    const duLieu = {
        phienBan: PHIEN_BAN,
        tenKy: period.tenKy,
        ngayDauKy: period.ngayBatDau,
        ngayCuoiKy: period.ngayKetThuc,
        sections,
        tongTaiSan,
        tongNguonVon,
        canDoi: Math.round(tongTaiSan.cuoiKy) === Math.round(tongNguonVon.cuoiKy)
            && Math.round(tongTaiSan.dauKy) === Math.round(tongNguonVon.dauKy),
    };

    return BaoCaoTaiChinh.findOneAndUpdate(
        { kyKeToan: kyKeToanId, loaiBaoCao: "bang_can_doi_ke_toan" },
        { duLieu, ngayLap: new Date() },
        { upsert: true, returnDocument: "after" }
    );
}

// ==================== Phân tích lãi lỗ theo khoảng ngày ====================
// Tính từ bút toán theo ngày ghi sổ, cùng công thức với báo cáo kết quả kinh doanh.
const Transaction = require("../models/Transaction");
const { monthKey } = require("./periodUtils");

const NHOM_CHI_PHI = { luong: "Lương nhân viên", khau_hao: "Khấu hao tài sản cố định", mua_hang: "Nguyên vật liệu", kho: "Nguyên vật liệu", tai_san: "Thanh lý tài sản cố định", thu_cong: "Khác (ghi sổ thủ công)" };

async function analyzePnl(from, to) {
    const accounts = await TKKeToan.find().lean();
    const byId = new Map(accounts.map((a) => [String(a._id), a]));
    const entries = await ButToan.find({ ngayGhi: { $gte: from, $lte: to } }).lean();

    const tk511 = accounts.find((a) => a.soHieuTK === "511");
    const toPs = (list) => {
        const ps = new Map();
        ps.vatSplit = list.filter((e) => e.nguon === "thue" && tk511 && String(e.tkNo) === String(tk511._id)).reduce((s, e) => s + e.soTien, 0);
        for (const e of list) {
            for (const [side, tk] of [["no", e.tkNo], ["co", e.tkCo]]) {
                const v = ps.get(String(tk)) || { no: 0, co: 0 };
                v[side] += e.soTien;
                ps.set(String(tk), v);
            }
        }
        return ps;
    };
    const ps0 = toPs(entries);
    const kq = tinhKetQua(accounts, ps0);

    // Chi phí hoạt động (641/642) theo danh mục; phiếu chi lấy theo danh mục của phiếu
    const code = (id) => byId.get(String(id))?.soHieuTK || "";
    const opex = entries.filter((e) => /^64[12]/.test(code(e.tkNo)) || /^64[12]/.test(code(e.tkCo)));
    const txIds = opex.filter((e) => e.nguon === "thu_chi" && e.nguonId).map((e) => e.nguonId);
    const txMap = new Map((await Transaction.find({ _id: { $in: txIds } }, "category").lean()).map((t) => [String(t._id), t.category]));
    const catMap = new Map();
    for (const e of opex) {
        const sign = /^64[12]/.test(code(e.tkNo)) ? 1 : -1;
        const cat = e.nguon === "thu_chi" ? (txMap.get(String(e.nguonId)) || "Chi khác") : (NHOM_CHI_PHI[e.nguon] || "Khác");
        const g = catMap.get(cat) || { danhMuc: cat, soTien: 0, soButToan: 0 };
        g.soTien += sign * e.soTien;
        g.soButToan++;
        catMap.set(cat, g);
    }
    const chiPhiTheoDanhMuc = [...catMap.values()].filter((g) => g.soTien).sort((a, b) => b.soTien - a.soTien);

    // Diễn biến theo tháng
    const monthGroups = new Map();
    for (const e of entries) {
        const k = monthKey(e.ngayGhi);
        if (!monthGroups.has(k)) monthGroups.set(k, []);
        monthGroups.get(k).push(e);
    }
    const theoThang = [...monthGroups.keys()].sort().map((k) => {
        const m = tinhKetQua(accounts, toPs(monthGroups.get(k)));
        const [y, mm] = k.split("-");
        return {
            thang: `${Number(mm)}/${y}`,
            doanhThuThuan: m.doanhThuThuan, giaVon: m.giaVon, loiNhuanGop: m.loiNhuanGop,
            chiPhiHoatDong: m.cpQuanLy + m.cpTaiChinh, khac: m.lnKhac + m.dtTaiChinh, loiNhuan: m.lnSauThue,
        };
    });

    const soDonHang = entries.filter((e) => e.nguon === "don_hang" && code(e.tkCo) === "511").length;
    const soHoanTien = entries.filter((e) => e.nguon === "hoan_tien").length;
    const thueGtgtDauRa = ps0.vatSplit;
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

    return {
        from, to, ...kq, soDonHang, soHoanTien, thueGtgtDauRa,
        chiPhiHoatDong: kq.cpQuanLy + kq.cpTaiChinh,
        bienLoiNhuanGop: pct(kq.loiNhuanGop, kq.doanhThuThuan),
        bienLoiNhuan: pct(kq.lnSauThue, kq.doanhThuThuan),
        giaTriDonTrungBinh: soDonHang ? Math.round(kq.doanhThu / soDonHang) : 0,
        chiPhiTheoDanhMuc,
        theoThang,
    };
}

module.exports = { generateIncomeStatement, generateBalanceSheet, analyzePnl, PHIEN_BAN };
