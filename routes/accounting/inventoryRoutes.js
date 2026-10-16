const express = require("express");
const router = express.Router();
const Kho = require("../../models/accounting/Kho");
const DanhMucNL = require("../../models/accounting/DanhMucNL");
const PhieuXuatNL = require("../../models/accounting/PhieuXuatNL");
const NguyenLieu = require("../../models/accounting/NguyenLieu");
const DinhMucMonAn = require("../../models/accounting/DinhMucMonAn");
const PhieuNhapKho = require("../../models/accounting/PhieuNhapKho");
const PhieuKiemKe = require("../../models/accounting/PhieuKiemKe");
const inventoryService = require("../../services/inventoryService");

// ==================== Kho (Warehouses) ====================
router.get("/acc/warehouses", async (req, res) => {
    try {
        const warehouses = await Kho.find().sort({ tenKho: 1 });
        res.json(warehouses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/warehouses/:id", async (req, res) => {
    try {
        const warehouse = await Kho.findById(req.params.id);
        if (!warehouse) return res.status(404).json({ error: "Không tìm thấy kho" });
        res.json(warehouse);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/warehouses", async (req, res) => {
    try {
        const warehouse = new Kho(req.body);
        await warehouse.save();
        res.status(201).json(warehouse);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/acc/warehouses/:id", async (req, res) => {
    try {
        const warehouse = await Kho.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!warehouse) return res.status(404).json({ error: "Không tìm thấy kho" });
        res.json(warehouse);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/warehouses/:id", async (req, res) => {
    try {
        const n = await DanhMucNL.countDocuments({ kho: req.params.id });
        if (n) return res.status(400).json({ error: `Kho đang chứa ${n} nguyên liệu, hãy chuyển nguyên liệu sang kho khác trước` });
        const warehouse = await Kho.findByIdAndDelete(req.params.id);
        if (!warehouse) return res.status(404).json({ error: "Không tìm thấy kho" });
        res.json({ message: "Đã xóa kho" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== Danh mục nguyên liệu ====================
// Kèm số món đang dùng (định mức) và giá trị tồn
router.get("/acc/materials", async (req, res) => {
    try {
        const [materials, usage] = await Promise.all([
            DanhMucNL.find().populate("kho").sort({ tenNL: 1 }).lean(),
            DinhMucMonAn.aggregate([{ $group: { _id: "$danhMucNL", n: { $sum: 1 } } }]),
        ]);
        const byId = new Map(usage.map((u) => [String(u._id), u.n]));
        res.json(materials.map((m) => ({
            ...m, soMonDung: byId.get(String(m._id)) || 0,
            giaTriTon: Math.round(Math.max(0, m.tonHienTai || 0) * (m.giaVonBinhQuan || 0)),
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/materials/:id", async (req, res) => {
    try {
        const material = await DanhMucNL.findById(req.params.id).populate("kho");
        if (!material) return res.status(404).json({ error: "Không tìm thấy nguyên liệu" });
        res.json(material);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Thẻ kho (sổ kho) của một nguyên liệu: ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/acc/materials/:id/stock-card", async (req, res) => {
    try {
        const from = req.query.from ? new Date(`${req.query.from}T00:00:00+07:00`) : null;
        const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999+07:00`) : null;
        res.json(await inventoryService.stockCard(req.params.id, from, to));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const materialFields = (b) => {
    const out = {};
    for (const k of ["maNL", "tenNL", "donViTinh", "kho", "ghiChu"]) if (b[k] !== undefined) out[k] = typeof b[k] === "string" ? b[k].trim() : b[k];
    if (b.tonToiThieu !== undefined) out.tonToiThieu = Math.max(0, Number(b.tonToiThieu) || 0);
    return out;
};

async function assertUniqueMaterial(data, id) {
    if (data.tenNL && await DanhMucNL.exists({ _id: { $ne: id }, tenNL: new RegExp(`^${data.tenNL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) {
        throw new Error(`Nguyên liệu "${data.tenNL}" đã có trong danh mục`);
    }
    if (data.maNL && await DanhMucNL.exists({ _id: { $ne: id }, maNL: data.maNL })) throw new Error(`Mã ${data.maNL} đã được dùng`);
}

// Thêm mới: được khai báo tồn đầu kỳ và đơn giá (nguyên liệu đang có sẵn khi bắt đầu dùng phần mềm)
router.post("/acc/materials", async (req, res) => {
    try {
        const data = materialFields(req.body);
        if (!data.tenNL) throw new Error("Vui lòng nhập tên nguyên liệu");
        await assertUniqueMaterial(data);
        if (!data.maNL) data.maNL = await inventoryService.nextMaterialCode();
        data.tonHienTai = Math.max(0, Number(req.body.tonHienTai) || 0);
        data.giaVonBinhQuan = Math.max(0, Math.round(Number(req.body.giaVonBinhQuan) || 0));
        if (data.tonHienTai > 0 && !(data.giaVonBinhQuan > 0)) throw new Error("Có tồn đầu kỳ thì phải nhập đơn giá vốn");
        const material = await DanhMucNL.create(data);
        try {
            await inventoryService.postOpeningStock(material); // ghi sổ tồn đầu kỳ để kho khớp TK 152
        } catch (err) {
            await material.deleteOne();
            throw err;
        }
        res.status(201).json(material);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Sửa: không cho sửa tay tồn kho / giá vốn (phải qua phiếu nhập, phiếu xuất hoặc kiểm kê)
router.put("/acc/materials/:id", async (req, res) => {
    try {
        const data = materialFields(req.body);
        await assertUniqueMaterial(data, req.params.id);
        const material = await DanhMucNL.findByIdAndUpdate(req.params.id, data, { returnDocument: "after", runValidators: true });
        if (!material) return res.status(404).json({ error: "Không tìm thấy nguyên liệu" });
        res.json(material);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/materials/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const [recipes, issued, received, counted] = await Promise.all([
            DinhMucMonAn.countDocuments({ danhMucNL: id }),
            NguyenLieu.exists({ danhMucNL: id }),
            PhieuNhapKho.exists({ "chiTiet.danhMucNL": id }),
            PhieuKiemKe.exists({ "chiTiet.danhMucNL": id }),
        ]);
        if (recipes) return res.status(400).json({ error: `Nguyên liệu đang có trong định mức của ${recipes} món, hãy gỡ khỏi công thức trước` });
        if (issued || received || counted) return res.status(400).json({ error: "Nguyên liệu đã phát sinh nhập / xuất / kiểm kê, không thể xóa" });
        if (!(await DanhMucNL.exists({ _id: id }))) return res.status(404).json({ error: "Không tìm thấy nguyên liệu" });
        await inventoryService.removeOpeningStock(id); // xóa bút toán tồn đầu kỳ (nếu có)
        await DanhMucNL.findByIdAndDelete(id);
        res.json({ message: "Đã xóa nguyên liệu" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Đối chiếu kho ↔ TK 152 ====================
router.get("/acc/inventory/reconcile", async (req, res) => {
    try {
        res.json(await inventoryService.reconcile());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/inventory/reconcile", async (req, res) => {
    try {
        res.status(201).json(await inventoryService.postReconcile({ nguoiLap: req.body?.nguoiLap }));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Phiếu xuất nguyên liệu ====================
router.get("/acc/material-issues", async (req, res) => {
    try {
        const filter = {};
        if (req.query.loai) filter.loaiXuat = req.query.loai;
        if (req.query.thang) {
            const [y, mth] = req.query.thang.split("-").map(Number);
            filter.ngayXuat = { $gte: new Date(Date.UTC(y, mth - 1, 1) - 7 * 3600e3), $lt: new Date(Date.UTC(y, mth, 1) - 7 * 3600e3) };
        }
        const issues = await PhieuXuatNL.find(filter).populate("kho", "tenKho").populate("order", "_id status").sort({ ngayXuat: -1, createdAt: -1 }).lean();
        const counts = await NguyenLieu.aggregate([
            { $match: { phieuXuat: { $in: issues.map((i) => i._id) } } },
            { $group: { _id: "$phieuXuat", n: { $sum: 1 }, tong: { $sum: { $ifNull: ["$thanhTien", 0] } } } },
        ]);
        const byId = new Map(counts.map((c) => [String(c._id), c]));
        res.json(issues.map((i) => ({
            ...i, soDong: byId.get(String(i._id))?.n || 0,
            tongTien: i.tongTien || byId.get(String(i._id))?.tong || 0,
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/material-issues/:id", async (req, res) => {
    try {
        const issue = await PhieuXuatNL.findById(req.params.id).populate("kho").populate({ path: "order", select: "_id status createdAt totalPrice items user", populate: [{ path: "items.product", select: "name" }, { path: "user", select: "name" }] }).lean();
        if (!issue) return res.status(404).json({ error: "Không tìm thấy phiếu xuất" });
        issue.lines = await NguyenLieu.find({ phieuXuat: issue._id }).populate({ path: "danhMucNL", populate: { path: "kho", select: "tenKho" } }).lean();
        res.json(issue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/material-issues", async (req, res) => {
    try {
        const { loaiXuat, ngayXuat, kho, lyDoXuat, nguoiNhan, nguoiLap, ghiChu, lines } = req.body;
        if (loaiXuat === "ban_hang") throw new Error("Phiếu xuất bán được lập tự động khi bếp nhận nấu đơn hàng");
        const issue = await inventoryService.createIssue({ loaiXuat, ngay: ngayXuat, kho, lyDoXuat, nguoiNhan, nguoiLap, ghiChu, lines });
        res.status(201).json(issue);
    } catch (err) {
        res.status(err.shortages ? 409 : 400).json({ error: err.message, shortages: err.shortages });
    }
});

// Xóa phiếu xuất: hoàn nguyên liệu về kho và xóa bút toán giá vốn
router.delete("/acc/material-issues/:id", async (req, res) => {
    try {
        await inventoryService.deleteIssue(req.params.id);
        res.json({ message: "Đã xóa phiếu xuất và hoàn nguyên liệu về kho" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Kiểm kê kho ====================
router.get("/acc/stocktakes", async (req, res) => {
    try {
        res.json(await PhieuKiemKe.find().populate("kho", "tenKho").sort({ ngay: -1, createdAt: -1 }).lean());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/stocktakes/:id", async (req, res) => {
    try {
        const p = await PhieuKiemKe.findById(req.params.id).populate("kho").lean();
        if (!p) return res.status(404).json({ error: "Không tìm thấy phiếu kiểm kê" });
        res.json(p);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/stocktakes", async (req, res) => {
    try {
        res.status(201).json(await inventoryService.createStocktake(req.body));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/stocktakes/:id", async (req, res) => {
    try {
        await inventoryService.deleteStocktake(req.params.id);
        res.json({ message: "Đã xóa phiếu kiểm kê, tồn kho được hoàn lại" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== Định mức món ăn ====================
router.get("/acc/recipes", async (req, res) => {
    try {
        const filter = {};
        if (req.query.product) filter.product = req.query.product;
        const recipes = await DinhMucMonAn.find(filter).populate("product danhMucNL");
        res.json(recipes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/acc/recipes/:id", async (req, res) => {
    try {
        const recipe = await DinhMucMonAn.findById(req.params.id).populate("product danhMucNL");
        if (!recipe) return res.status(404).json({ error: "Không tìm thấy định mức" });
        res.json(recipe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/acc/recipes", async (req, res) => {
    try {
        if (!(Number(req.body.dinhLuong) > 0)) throw new Error("Định lượng phải lớn hơn 0");
        if (await DinhMucMonAn.exists({ product: req.body.product, danhMucNL: req.body.danhMucNL })) {
            throw new Error("Nguyên liệu này đã có trong công thức của món");
        }
        const recipe = new DinhMucMonAn(req.body);
        await recipe.save();
        res.status(201).json(recipe);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put("/acc/recipes/:id", async (req, res) => {
    try {
        const recipe = await DinhMucMonAn.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!recipe) return res.status(404).json({ error: "Không tìm thấy định mức" });
        res.json(recipe);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/acc/recipes/:id", async (req, res) => {
    try {
        const recipe = await DinhMucMonAn.findByIdAndDelete(req.params.id);
        if (!recipe) return res.status(404).json({ error: "Không tìm thấy định mức" });
        res.json({ message: "Đã xóa định mức" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
