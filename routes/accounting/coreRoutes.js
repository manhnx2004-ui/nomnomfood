const express = require("express");
const router = express.Router();
const KyKeToan = require("../../models/accounting/KyKeToan");
const TKKeToan = require("../../models/accounting/TKKeToan");
const ButToan = require("../../models/accounting/ButToan");
const SoCai = require("../../models/accounting/SoCai");
const Order = require("../../models/Order");
const journalService = require("../../services/journalService");
const statementService = require("../../services/statementService");

// ==================== Kỳ kế toán ====================
const { monthKey, isPeriodExpired, countPeriodRefs } = require("../../services/periodUtils");

const monthLabel = (key) => { const [y, m] = key.split("-"); return `${Number(m)}/${y}`; };

// Mỗi tháng chỉ có một kỳ kế toán, nằm gọn trong tháng đó và chưa qua
async function validatePeriod({ ngayBatDau, ngayKetThuc }, excludeId) {
    const start = new Date(ngayBatDau);
    const end = new Date(ngayKetThuc);
    if (isNaN(start) || isNaN(end)) return "Ngày bắt đầu/kết thúc không hợp lệ";
    if (start > end) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc";
    const key = monthKey(start);
    if (key !== monthKey(end)) return "Kỳ kế toán phải nằm trong cùng một tháng";
    if (isPeriodExpired({ ngayKetThuc: end })) return "Không thể lập kỳ kế toán cho tháng đã qua";

    const filter = { thang: key };
    if (excludeId) filter._id = { $ne: excludeId };
    const dup = await KyKeToan.findOne(filter);
    if (dup) return `Tháng ${monthLabel(key)} đã có kỳ kế toán "${dup.tenKy}", không thể tạo trùng`;
    return null;
}

// Lỗi trùng khóa từ unique index (trường hợp hai yêu cầu tạo cùng lúc)
const periodErrorMessage = (err) =>
    err.code === 11000 ? "Tháng này đã có kỳ kế toán, không thể tạo trùng" : err.message;

router.get("/acc/periods", async (req, res) => {
    try {
        // Tự động đóng các kỳ đã qua
        const openPeriods = await KyKeToan.find({ trangThai: "mo" });
        const expiredIds = openPeriods.filter((p) => isPeriodExpired(p)).map((p) => p._id);
        if (expiredIds.length) await KyKeToan.updateMany({ _id: { $in: expiredIds } }, { trangThai: "dong" });
        const periods = await KyKeToan.find().sort({ ngayBatDau: -1 }).lean();

        // Tổng hợp dữ liệu phát sinh của từng kỳ
        const tk511 = await TKKeToan.findOne({ soHieuTK: "511" });
        const stats = await ButToan.aggregate([
            { $group: {
                _id: "$kyKeToan",
                soButToan: { $sum: 1 },
                soDonHang: { $sum: { $cond: [{ $eq: ["$nguon", "don_hang"] }, 1, 0] } },
                doanhThu: { $sum: { $cond: [{ $eq: ["$tkCo", tk511 ? tk511._id : null] }, "$soTien", 0] } },
            } },
        ]);
        const statMap = new Map(stats.map((s) => [String(s._id), s]));
        res.json(periods.map((p) => {
            const s = statMap.get(String(p._id));
            return { ...p, soButToan: s?.soButToan || 0, soDonHang: s?.soDonHang || 0, doanhThu: s?.doanhThu || 0 };
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Chi tiết một kỳ: giải thích các số tổng hợp (đơn hàng, doanh thu, bút toán)
router.get("/acc/periods/:id/detail", async (req, res) => {
    try {
        const period = await KyKeToan.findById(req.params.id).lean();
        if (!period) return res.status(404).json({ error: "Không tìm thấy kỳ kế toán" });

        const entries = await ButToan.find({ kyKeToan: period._id })
            .populate("tkNo tkCo", "soHieuTK tenTK")
            .sort({ ngayGhi: 1, createdAt: 1 })
            .lean();

        // Theo nguồn phát sinh
        const byNguonMap = new Map();
        for (const e of entries) {
            const g = byNguonMap.get(e.nguon) || { nguon: e.nguon, soButToan: 0, soTien: 0 };
            g.soButToan++;
            g.soTien += e.soTien;
            byNguonMap.set(e.nguon, g);
        }

        // Doanh thu = các bút toán ghi Có TK 511
        const revenueEntries = entries.filter((e) => e.tkCo?.soHieuTK === "511");
        const orderRevenue = revenueEntries.filter((e) => e.nguon === "don_hang");
        const otherRevenue = revenueEntries.filter((e) => e.nguon !== "don_hang");

        const orderIds = orderRevenue.map((e) => e.nguonId).filter(Boolean);
        const orderDocs = await Order.find({ _id: { $in: orderIds } })
            .populate("user", "name email")
            .populate("items.product", "name")
            .lean();
        const orderMap = new Map(orderDocs.map((o) => [String(o._id), o]));
        const orders = orderRevenue.map((e) => {
            const o = orderMap.get(String(e.nguonId));
            return {
                _id: e.nguonId,
                ngayGhi: e.ngayGhi,
                soTien: e.soTien,
                khachHang: o?.shippingAddress?.receiverName || o?.user?.name || "",
                items: (o?.items || []).map((it) => ({ name: it.product?.name || "(món đã xóa)", quantity: it.quantity, price: it.price })),
                daXoa: !o,
            };
        });

        res.json({
            period,
            summary: {
                soDonHang: orders.length,
                doanhThu: revenueEntries.reduce((s, e) => s + e.soTien, 0),
                doanhThuDonHang: orderRevenue.reduce((s, e) => s + e.soTien, 0),
                doanhThuKhac: otherRevenue.reduce((s, e) => s + e.soTien, 0),
                soButToan: entries.length,
            },
            byNguon: [...byNguonMap.values()].sort((a, b) => b.soButToan - a.soButToan),
            orders,
            otherRevenue,
            entries,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/periods", async (req, res) => {
    try {
        const error = await validatePeriod(req.body);
        if (error) return res.status(400).json({ error });
        const { tenKy, ngayBatDau, ngayKetThuc, trangThai } = req.body;
        const period = new KyKeToan({ tenKy, ngayBatDau, ngayKetThuc, trangThai });
        await period.save();
        res.status(201).json(period);
    } catch (err) {
        res.status(400).json({ error: periodErrorMessage(err) });
    }
});

router.put("/acc/periods/:id", async (req, res) => {
    try {
        const period = await KyKeToan.findById(req.params.id);
        if (!period) return res.status(404).json({ error: "Không tìm thấy kỳ kế toán" });
        if (isPeriodExpired(period)) {
            return res.status(403).json({ error: "Kỳ kế toán đã qua, không thể chỉnh sửa" });
        }
        const { tenKy, ngayBatDau, ngayKetThuc, trangThai } = req.body;
        const error = await validatePeriod({
            ngayBatDau: ngayBatDau ?? period.ngayBatDau,
            ngayKetThuc: ngayKetThuc ?? period.ngayKetThuc,
        }, period._id);
        if (error) return res.status(400).json({ error });
        // Dùng save() để hook cập nhật lại khóa tháng
        if (tenKy !== undefined) period.tenKy = tenKy;
        if (ngayBatDau !== undefined) period.ngayBatDau = ngayBatDau;
        if (ngayKetThuc !== undefined) period.ngayKetThuc = ngayKetThuc;
        if (trangThai !== undefined) period.trangThai = trangThai;
        await period.save();
        res.json(period);
    } catch (err) {
        res.status(400).json({ error: periodErrorMessage(err) });
    }
});

router.delete("/acc/periods/:id", async (req, res) => {
    try {
        const period = await KyKeToan.findById(req.params.id);
        if (!period) return res.status(404).json({ error: "Không tìm thấy kỳ kế toán" });
        // Cho phép xóa cả kỳ đã khóa, nhưng không xóa kỳ đã có dữ liệu để tránh mất sổ sách
        const refs = await countPeriodRefs(KyKeToan.db.db, period._id);
        if (refs > 0) {
            return res.status(409).json({
                error: `Kỳ "${period.tenKy}" đã có ${refs} bản ghi dữ liệu (bút toán, sổ cái, lương...), không thể xóa`,
            });
        }
        await period.deleteOne();
        res.json({ message: "Đã xóa kỳ kế toán" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Hệ thống tài khoản ====================
router.get("/acc/chart-of-accounts", async (req, res) => {
    try {
        const accounts = await TKKeToan.find().sort({ soHieuTK: 1 }).lean();

        // Tổng phát sinh Nợ/Có của từng tài khoản trên toàn bộ các kỳ
        const [noAgg, coAgg] = await Promise.all([
            ButToan.aggregate([{ $group: { _id: "$tkNo", tong: { $sum: "$soTien" }, n: { $sum: 1 } } }]),
            ButToan.aggregate([{ $group: { _id: "$tkCo", tong: { $sum: "$soTien" }, n: { $sum: 1 } } }]),
        ]);
        const noMap = new Map(noAgg.map((a) => [String(a._id), a]));
        const coMap = new Map(coAgg.map((a) => [String(a._id), a]));
        res.json(accounts.map((a) => {
            const no = noMap.get(String(a._id)) || { tong: 0, n: 0 };
            const co = coMap.get(String(a._id)) || { tong: 0, n: 0 };
            return {
                ...a,
                tongNo: no.tong,
                tongCo: co.tong,
                soDu: a.banChat === "no" ? no.tong - co.tong : co.tong - no.tong,
                soButToan: no.n + co.n,
            };
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Chi tiết một tài khoản: mọi bút toán liên quan, theo kỳ, theo tài khoản đối ứng, theo nguồn
// ?period=<id> để lọc theo một kỳ
router.get("/acc/chart-of-accounts/:id/detail", async (req, res) => {
    try {
        const account = await TKKeToan.findById(req.params.id).lean();
        if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản" });

        const filter = { $or: [{ tkNo: account._id }, { tkCo: account._id }] };
        if (req.query.period) filter.kyKeToan = req.query.period;
        const raw = await ButToan.find(filter)
            .populate("tkNo tkCo", "soHieuTK tenTK")
            .populate("kyKeToan", "tenKy ngayBatDau")
            .sort({ ngayGhi: 1, createdAt: 1 })
            .lean();

        const sign = account.banChat === "no" ? 1 : -1;
        let running = 0;
        const entries = raw.map((e) => {
            const isNo = String(e.tkNo?._id) === String(account._id);
            const no = isNo ? e.soTien : 0;
            const co = isNo ? 0 : e.soTien;
            running += sign * (no - co);
            return {
                _id: e._id,
                ngayGhi: e.ngayGhi,
                noiDung: e.noiDung,
                nguon: e.nguon,
                kyKeToan: e.kyKeToan,
                doiUng: isNo ? e.tkCo : e.tkNo,
                no,
                co,
                soDuLuyKe: running,
            };
        });

        const group = (keyFn, init) => {
            const map = new Map();
            for (const e of entries) {
                const key = keyFn(e);
                const g = map.get(key) || { ...init(e), no: 0, co: 0, soButToan: 0 };
                g.no += e.no;
                g.co += e.co;
                g.soButToan++;
                map.set(key, g);
            }
            return [...map.values()].map((g) => ({ ...g, soDu: sign * (g.no - g.co) }));
        };

        const byPeriod = group((e) => String(e.kyKeToan?._id), (e) => ({ kyKeToan: e.kyKeToan }))
            .sort((a, b) => new Date(a.kyKeToan?.ngayBatDau) - new Date(b.kyKeToan?.ngayBatDau));
        const byCounterpart = group((e) => String(e.doiUng?._id), (e) => ({ taiKhoan: e.doiUng }))
            .sort((a, b) => (b.no + b.co) - (a.no + a.co));
        const byNguon = group((e) => e.nguon, (e) => ({ nguon: e.nguon }))
            .sort((a, b) => b.soButToan - a.soButToan);

        const tongNo = entries.reduce((s, e) => s + e.no, 0);
        const tongCo = entries.reduce((s, e) => s + e.co, 0);
        res.json({
            account,
            summary: { tongNo, tongCo, soDu: sign * (tongNo - tongCo), soButToan: entries.length },
            byPeriod,
            byCounterpart,
            byNguon,
            entries,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/chart-of-accounts", async (req, res) => {
    try {
        const account = new TKKeToan(req.body);
        await account.save();
        res.status(201).json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/acc/chart-of-accounts/:id", async (req, res) => {
    try {
        const account = await TKKeToan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản" });
        res.json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/chart-of-accounts/:id", async (req, res) => {
    try {
        const account = await TKKeToan.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản" });
        res.json({ message: "Đã xóa tài khoản" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Bút toán (sổ nhật ký chung) ====================
router.get("/acc/journal-entries", async (req, res) => {
    try {
        const filter = {};
        if (req.query.period) filter.kyKeToan = req.query.period;
        if (req.query.account) filter.$or = [{ tkNo: req.query.account }, { tkCo: req.query.account }];
        const entries = await ButToan.find(filter)
            .populate("tkNo tkCo kyKeToan")
            .sort({ ngayGhi: -1, createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/journal-entries", async (req, res) => {
    try {
        const { kyKeToan, ngayGhi, noiDung, tkNo, tkCo, soTien } = req.body;
        const period = kyKeToan ? await KyKeToan.findById(kyKeToan) : null;
        if (period && (period.trangThai === "dong" || isPeriodExpired(period))) {
            return res.status(403).json({ error: "Kỳ kế toán đã đóng, không thể ghi thêm bút toán" });
        }
        const entry = await journalService.postButToan({
            kyKeToan, ngayGhi, noiDung, tkNo, tkCo, soTien, nguon: "thu_cong",
        });
        res.status(201).json(entry);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Sổ cái ====================
router.get("/acc/ledger", async (req, res) => {
    try {
        const filter = {};
        if (req.query.period) filter.kyKeToan = req.query.period;
        if (req.query.account) filter.tkKeToan = req.query.account;
        const ledger = await SoCai.find(filter).populate("tkKeToan kyKeToan");
        ledger.sort((a, b) => {
            const soA = a.tkKeToan ? a.tkKeToan.soHieuTK : "";
            const soB = b.tkKeToan ? b.tkKeToan.soHieuTK : "";
            return soA.localeCompare(soB);
        });
        res.json(ledger);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/ledger/detail", async (req, res) => {
    try {
        const { period, account } = req.query;
        if (!period || !account) return res.status(400).json({ error: "Thiếu kỳ kế toán hoặc tài khoản" });
        const entries = await ButToan.find({
            kyKeToan: period,
            $or: [{ tkNo: account }, { tkCo: account }],
        }).populate("tkNo tkCo").sort({ ngayGhi: 1, createdAt: 1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Số dư đầu kỳ = số dư lũy kế của tài khoản qua tất cả các kỳ trước.
// TK doanh thu / chi phí được kết chuyển hết vào cuối mỗi kỳ nên đầu kỳ luôn bằng 0.
router.get("/acc/ledger/opening", async (req, res) => {
    try {
        const { period, account } = req.query;
        if (!period || !account) return res.status(400).json({ error: "Thiếu kỳ kế toán hoặc tài khoản" });
        const [ky, tk] = await Promise.all([KyKeToan.findById(period), TKKeToan.findById(account)]);
        if (!ky || !tk) return res.status(404).json({ error: "Không tìm thấy kỳ kế toán hoặc tài khoản" });

        if (tk.loaiTK === "doanh_thu" || tk.loaiTK === "chi_phi") {
            return res.json({ soDuDauKy: 0, ketChuyen: true });
        }
        const priorIds = (await KyKeToan.find({ ngayBatDau: { $lt: ky.ngayBatDau } }, "_id")).map((p) => p._id);
        const sumSide = async (side) => {
            const [agg] = await ButToan.aggregate([
                { $match: { kyKeToan: { $in: priorIds }, [side]: tk._id } },
                { $group: { _id: null, total: { $sum: "$soTien" } } },
            ]);
            return agg ? agg.total : 0;
        };
        const [no, co] = await Promise.all([sumSide("tkNo"), sumSide("tkCo")]);
        res.json({ soDuDauKy: tk.banChat === "no" ? no - co : co - no, ketChuyen: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Phân tích lãi lỗ ====================
// ?from=YYYY-MM-DD&to=YYYY-MM-DD (theo giờ Việt Nam, tính cả ngày cuối)
router.get("/acc/pnl", async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: "Thiếu khoảng thời gian" });
        const start = new Date(`${from}T00:00:00+07:00`);
        const end = new Date(`${to}T23:59:59.999+07:00`);
        if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: "Ngày không hợp lệ" });
        if (start > end) return res.status(400).json({ error: "Ngày bắt đầu phải nhỏ hơn ngày kết thúc" });
        res.json(await statementService.analyzePnl(start, end));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Báo cáo tài chính ====================
router.get("/acc/statements", async (req, res) => {
    try {
        const { period, type, refresh } = req.query;
        if (!period || !type) return res.status(400).json({ error: "Thiếu kỳ kế toán hoặc loại báo cáo" });

        const BaoCaoTaiChinh = require("../../models/accounting/BaoCaoTaiChinh");
        if (!refresh) {
            const existing = await BaoCaoTaiChinh.findOne({ kyKeToan: period, loaiBaoCao: type });
            // Báo cáo lưu theo cấu trúc cũ thì tính lại
            if (existing && existing.duLieu?.phienBan === statementService.PHIEN_BAN) return res.json(existing);
        }

        const report = type === "bang_can_doi_ke_toan"
            ? await statementService.generateBalanceSheet(period)
            : await statementService.generateIncomeStatement(period);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
