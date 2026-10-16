const express = require("express");
const router = express.Router();
const NhaCungCap = require("../../models/accounting/NhaCungCap");
const PhieuNhapKho = require("../../models/accounting/PhieuNhapKho");
const HoaDonMuaNL = require("../../models/accounting/HoaDonMuaNL");
const CongNoPhaiTraNCC = require("../../models/accounting/CongNoPhaiTraNCC");
const ButToan = require("../../models/accounting/ButToan");
const journalService = require("../../services/journalService");
const { getOpenPeriod, getAccountByCode } = require("../../services/accountingHelpers");
const purchaseService = require("../../services/purchaseService");

// ==================== Nhà cung cấp ====================
router.get("/acc/suppliers", async (req, res) => {
    try {
        const suppliers = await NhaCungCap.find().sort({ tenNCC: 1 });
        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/suppliers/:id", async (req, res) => {
    try {
        const supplier = await NhaCungCap.findById(req.params.id);
        if (!supplier) return res.status(404).json({ error: "Không tìm thấy nhà cung cấp" });
        res.json(supplier);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/suppliers", async (req, res) => {
    try {
        const supplier = new NhaCungCap(req.body);
        await supplier.save();
        res.status(201).json(supplier);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/acc/suppliers/:id", async (req, res) => {
    try {
        const supplier = await NhaCungCap.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!supplier) return res.status(404).json({ error: "Không tìm thấy nhà cung cấp" });
        res.json(supplier);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/suppliers/:id", async (req, res) => {
    try {
        const supplier = await NhaCungCap.findByIdAndDelete(req.params.id);
        if (!supplier) return res.status(404).json({ error: "Không tìm thấy nhà cung cấp" });
        res.json({ message: "Đã xóa nhà cung cấp" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Phiếu nhập kho ====================
const populateReceipt = (q) => q.populate("ncc").populate("kho", "tenKho diaDiem").populate("hoaDonMua", "soHoaDon");

router.get("/acc/goods-receipts", async (req, res) => {
    try {
        const receipts = await populateReceipt(PhieuNhapKho.find()).sort({ ngayNhap: -1, createdAt: -1 });
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/goods-receipts/:id", async (req, res) => {
    try {
        const receipt = await populateReceipt(PhieuNhapKho.findById(req.params.id));
        if (!receipt) return res.status(404).json({ error: "Không tìm thấy phiếu nhập kho" });
        res.json(receipt);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lập phiếu nhập: cộng tồn kho, cập nhật giá vốn, ghi sổ và công nợ
router.post("/acc/goods-receipts", async (req, res) => {
    try {
        const receipt = await purchaseService.createGoodsReceipt(req.body);
        res.status(201).json(await populateReceipt(PhieuNhapKho.findById(receipt._id)));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Chỉ sửa thông tin mô tả; số lượng/giá trị đã ghi sổ thì xóa phiếu và lập lại
router.put("/acc/goods-receipts/:id", async (req, res) => {
    try {
        const { nguoiGiao, nguoiLap, dienGiai } = req.body;
        const update = {};
        if (nguoiGiao !== undefined) update.nguoiGiao = nguoiGiao;
        if (nguoiLap !== undefined) update.nguoiLap = nguoiLap;
        if (dienGiai !== undefined) update.dienGiai = dienGiai;
        const receipt = await populateReceipt(PhieuNhapKho.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" }));
        if (!receipt) return res.status(404).json({ error: "Không tìm thấy phiếu nhập kho" });
        res.json(receipt);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/goods-receipts/:id", async (req, res) => {
    try {
        await purchaseService.deleteGoodsReceipt(req.params.id);
        res.json({ message: "Đã xóa phiếu nhập kho" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Hóa đơn mua nguyên liệu ====================
const populateInvoice = (q) => q
    .populate("ncc")
    .populate({ path: "phieuNhap", select: "soPhieu ngayNhap kho tienHang", populate: { path: "kho", select: "tenKho" } });

// Gắn tình trạng thanh toán (từ công nợ) vào từng hóa đơn
async function withPayment(invoices) {
    const list = Array.isArray(invoices) ? invoices : [invoices];
    const payables = await CongNoPhaiTraNCC.find({ hoaDonMua: { $in: list.map((i) => i._id) } }).lean();
    const map = new Map(payables.map((p) => [String(p.hoaDonMua), p]));
    const out = list.map((i) => {
        const obj = i.toObject ? i.toObject() : i;
        const p = map.get(String(obj._id));
        obj.tongThanhToan = (obj.tienHang || 0) + (obj.thueGtgtDauVao || 0);
        obj.congNo = p ? { _id: p._id, soTienNo: p.soTienNo, daTra: p.daTra, conLai: p.soTienNo - p.daTra, trangThai: p.trangThai } : null;
        return obj;
    });
    return Array.isArray(invoices) ? out : out[0];
}

router.get("/acc/purchase-invoices", async (req, res) => {
    try {
        const invoices = await populateInvoice(HoaDonMuaNL.find()).sort({ ngayHoaDon: -1, createdAt: -1 });
        res.json(await withPayment(invoices));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/purchase-invoices/:id", async (req, res) => {
    try {
        const invoice = await populateInvoice(HoaDonMuaNL.findById(req.params.id));
        if (!invoice) return res.status(404).json({ error: "Không tìm thấy hóa đơn mua hàng" });
        const result = await withPayment(invoice);
        result.butToan = await ButToan.find({ nguonId: invoice._id }).populate("tkNo tkCo", "soHieuTK tenTK").sort({ ngayGhi: 1 }).lean();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lập hóa đơn mua, liên kết phiếu nhập kho: phieu_co_san | tao_phieu | khong
router.post("/acc/purchase-invoices", async (req, res) => {
    try {
        const invoice = await purchaseService.createInvoiceWithLink(req.body);
        res.status(201).json(await withPayment(await populateInvoice(HoaDonMuaNL.findById(invoice._id))));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Chỉ sửa thông tin mô tả; số tiền đã ghi sổ thì xóa hóa đơn và lập lại
router.put("/acc/purchase-invoices/:id", async (req, res) => {
    try {
        const update = {};
        for (const f of ["mauSo", "kyHieu", "ngayHoaDon", "hanThanhToan", "ghiChu"]) {
            if (req.body[f] !== undefined) update[f] = req.body[f] || (f === "ngayHoaDon" || f === "hanThanhToan" ? null : "");
        }
        const invoice = await populateInvoice(HoaDonMuaNL.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" }));
        if (!invoice) return res.status(404).json({ error: "Không tìm thấy hóa đơn mua hàng" });
        res.json(await withPayment(invoice));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/purchase-invoices/:id", async (req, res) => {
    try {
        await purchaseService.deletePurchaseInvoice(req.params.id);
        res.json({ message: "Đã xóa hóa đơn mua hàng" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Công nợ phải trả nhà cung cấp ====================
router.get("/acc/payables", async (req, res) => {
    try {
        const payables = await CongNoPhaiTraNCC.find().populate("ncc hoaDonMua").sort({ createdAt: -1 });
        res.json(payables);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/payables/:id", async (req, res) => {
    try {
        const payable = await CongNoPhaiTraNCC.findById(req.params.id).populate("ncc hoaDonMua");
        if (!payable) return res.status(404).json({ error: "Không tìm thấy công nợ phải trả" });
        res.json(payable);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/payables", async (req, res) => {
    try {
        const payable = new CongNoPhaiTraNCC(req.body);
        await payable.save();
        res.status(201).json(payable);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/acc/payables/:id", async (req, res) => {
    try {
        const before = await CongNoPhaiTraNCC.findById(req.params.id);
        if (!before) return res.status(404).json({ error: "Không tìm thấy công nợ phải trả" });

        const payable = await CongNoPhaiTraNCC.findByIdAndUpdate(req.params.id, req.body, { new: true });

        const paidIncrease = payable.daTra - before.daTra;
        if (paidIncrease > 0) {
            const period = await getOpenPeriod();
            const tk331 = await getAccountByCode("331");
            const tk111 = await getAccountByCode("111");
            if (period && tk331 && tk111) {
                await journalService.postButToan({
                    kyKeToan: period._id,
                    noiDung: `Thanh toán công nợ phải trả nhà cung cấp`,
                    tkNo: tk331._id,
                    tkCo: tk111._id,
                    soTien: paidIncrease,
                    nguon: "mua_hang",
                    nguonId: payable._id,
                });
            }
        }

        if (payable.daTra <= 0) {
            payable.trangThai = "chua_thanh_toan";
        } else if (payable.daTra >= payable.soTienNo) {
            payable.trangThai = "da_thanh_toan";
        } else {
            payable.trangThai = "da_thanh_toan_mot_phan";
        }
        await payable.save();

        res.json(payable);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/payables/:id", async (req, res) => {
    try {
        const payable = await CongNoPhaiTraNCC.findByIdAndDelete(req.params.id);
        if (!payable) return res.status(404).json({ error: "Không tìm thấy công nợ phải trả" });
        res.json({ message: "Đã xóa công nợ phải trả" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
