const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Debt = require("../models/Debt");
const journalService = require("../services/journalService");
const { getOpenPeriod, getAccountByCode, resolveTransactionCounterAccount } = require("../services/accountingHelpers");

// ==================== Sổ quỹ thu/chi ====================
router.get("/transactions", async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/transactions", async (req, res) => {
    try {
        const transaction = new Transaction(req.body);
        await transaction.save();

        const period = await getOpenPeriod();
        const tk111 = await getAccountByCode("111");
        const counterAccount = await resolveTransactionCounterAccount(transaction.type, transaction.category);
        if (period && tk111 && counterAccount) {
            const entry = await journalService.postButToan({
                kyKeToan: period._id,
                ngayGhi: transaction.date,
                noiDung: `${transaction.type === "thu" ? "Phiếu thu" : "Phiếu chi"}: ${transaction.category}${transaction.description ? " - " + transaction.description : ""}`,
                tkNo: transaction.type === "thu" ? tk111._id : counterAccount._id,
                tkCo: transaction.type === "thu" ? counterAccount._id : tk111._id,
                soTien: transaction.amount,
                nguon: "thu_chi",
                nguonId: transaction._id,
            });
            transaction.butToan = entry._id;
            await transaction.save();
        }

        res.status(201).json(transaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/transactions/:id", async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!transaction) return res.status(404).json({ error: "Không tìm thấy phiếu thu/chi" });
        res.json(transaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/transactions/:id", async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);
        if (!transaction) return res.status(404).json({ error: "Không tìm thấy phiếu thu/chi" });
        res.json({ message: "Đã xóa phiếu thu/chi" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Công nợ ====================
router.get("/debts", async (req, res) => {
    try {
        const debts = await Debt.find().populate("order").sort({ createdAt: -1 });
        res.json(debts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/debts", async (req, res) => {
    try {
        const debt = new Debt(req.body);
        await debt.save();
        res.status(201).json(debt);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/debts/:id", async (req, res) => {
    try {
        const before = await Debt.findById(req.params.id);
        if (!before) return res.status(404).json({ error: "Không tìm thấy công nợ" });

        const debt = await Debt.findByIdAndUpdate(req.params.id, req.body, { new: true });

        const paidIncrease = debt.paidAmount - before.paidAmount;
        if (paidIncrease > 0) {
            const period = await getOpenPeriod();
            const tk111 = await getAccountByCode("111");
            const tk131 = await getAccountByCode("131");
            const tk331 = await getAccountByCode("331");
            if (period && tk111 && tk131 && tk331) {
                await journalService.postButToan({
                    kyKeToan: period._id,
                    noiDung: `Thanh toán công nợ với ${debt.partner}`,
                    tkNo: debt.type === "receivable" ? tk111._id : tk331._id,
                    tkCo: debt.type === "receivable" ? tk131._id : tk111._id,
                    soTien: paidIncrease,
                    nguon: "cong_no",
                    nguonId: debt._id,
                });
            }
        }

        res.json(debt);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/debts/:id", async (req, res) => {
    try {
        const debt = await Debt.findByIdAndDelete(req.params.id);
        if (!debt) return res.status(404).json({ error: "Không tìm thấy công nợ" });
        res.json({ message: "Đã xóa công nợ" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Trung tâm công nợ & phiếu thu/chi ====================
const debtService = require("../services/debtService");
const PhieuThanhToan = require("../models/accounting/PhieuThanhToan");

// Toàn bộ công nợ: phải trả NCC (từ hóa đơn mua) + công nợ nhập tay, kèm số tổng hợp
router.get("/acc/debt-center", async (req, res) => {
    try {
        const rows = await debtService.listDebts();
        const sum = (fn) => rows.filter(fn).reduce((s, r) => s + r.conLai, 0);
        res.json({
            rows,
            summary: {
                phaiTra: sum((r) => r.loai === "phai_tra"),
                phaiTraQuaHan: sum((r) => r.loai === "phai_tra" && r.quaHan),
                phaiThu: sum((r) => r.loai === "phai_thu"),
                phaiThuQuaHan: sum((r) => r.loai === "phai_thu" && r.quaHan),
                soKhoanMo: rows.filter((r) => r.conLai > 0).length,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/debt-payments", async (req, res) => {
    try {
        res.json(await PhieuThanhToan.find().sort({ ngay: -1, createdAt: -1 }).lean());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/debt-payments/:id", async (req, res) => {
    try {
        const p = await PhieuThanhToan.findById(req.params.id).populate("ncc", "tenNCC diaChi maSoThue sdt").lean();
        if (!p) return res.status(404).json({ error: "Không tìm thấy phiếu" });
        res.json(p);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lập phiếu chi / phiếu thu và ghi sổ
router.post("/acc/debt-payments", async (req, res) => {
    try {
        const phieu = await debtService.createPayment(req.body);
        res.status(201).json(phieu);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Hủy phiếu: xóa bút toán và hoàn lại công nợ
router.delete("/acc/debt-payments/:id", async (req, res) => {
    try {
        await debtService.cancelPayment(req.params.id);
        res.json({ message: "Đã hủy phiếu" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
