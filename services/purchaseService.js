// Nghiệp vụ mua hàng: hóa đơn mua nguyên liệu và phiếu nhập kho (liên kết hai chiều)
const HoaDonMuaNL = require("../models/accounting/HoaDonMuaNL");
const CongNoPhaiTraNCC = require("../models/accounting/CongNoPhaiTraNCC");
const NhaCungCap = require("../models/accounting/NhaCungCap");
const PhieuNhapKho = require("../models/accounting/PhieuNhapKho");
const DanhMucNL = require("../models/accounting/DanhMucNL");
const ButToan = require("../models/accounting/ButToan");
const ThueGTGT = require("../models/accounting/ThueGTGT");
const journalService = require("./journalService");
const { getPeriodForDate, getAccountByCode } = require("./accountingHelpers");
const { isPeriodExpired, monthKey } = require("./periodUtils");

const VAT_RATES = [0, 5, 8, 10];

// Kỳ kế toán của ngày phát sinh; kỳ đã qua hoặc đã chốt thuế thì không cho ghi thêm
async function periodForPosting(date) {
    const period = await getPeriodForDate(date);
    if (isPeriodExpired(period)) throw new Error(`Kỳ ${period.tenKy} đã khóa, không thể ghi nhận nghiệp vụ vào kỳ này`);
    if (await ThueGTGT.exists({ kyKeToan: period._id, trangThai: { $ne: "nhap" } })) {
        throw new Error(`Tờ khai thuế GTGT kỳ ${period.tenKy} đã chốt, hãy mở lại trước`);
    }
    return period;
}

// Bút toán thuộc kỳ đã khóa / đã chốt thuế thì không được xóa
async function assertEntriesRemovable(entries, what) {
    for (const e of entries) {
        const period = await getPeriodForDate(e.ngayGhi);
        if (isPeriodExpired(period)) throw new Error(`${what} đã ghi sổ vào kỳ ${period.tenKy} (đã khóa), không thể xóa`);
        if (await ThueGTGT.exists({ kyKeToan: e.kyKeToan, trangThai: { $ne: "nhap" } })) {
            throw new Error(`Tờ khai thuế GTGT kỳ ${period.tenKy} đã chốt, hãy mở lại trước khi xóa`);
        }
    }
}

async function removeEntries(entries) {
    await ButToan.deleteMany({ _id: { $in: entries.map((e) => e._id) } });
    for (const e of entries) {
        await journalService.recomputeSoCai(e.kyKeToan, e.tkNo);
        await journalService.recomputeSoCai(e.kyKeToan, e.tkCo);
    }
}

function vatAmount(tienHang, thueSuat, thueGtgt) {
    if (thueGtgt !== undefined && thueGtgt !== null && thueGtgt !== "") return Math.max(0, Math.round(Number(thueGtgt)));
    const rate = VAT_RATES.includes(Number(thueSuat)) ? Number(thueSuat) : 0;
    return Math.round((tienHang * rate) / 100);
}

// ==================== Hóa đơn mua hàng ====================
// Ghi sổ: Nợ 152 / Có 331 (tiền hàng), Nợ 1331 / Có 331 (thuế), công nợ NCC;
// thanh toán ngay bằng tiền mặt / chuyển khoản: Nợ 331 / Có 111 hoặc 112.
// `daGhiNhanHang`: hàng đã được ghi Nợ 152 từ phiếu nhập nên chỉ ghi phần thuế.
async function createPurchaseInvoice(data) {
    const { ncc, phieuNhap, soHoaDon, tienHang, ngay, daGhiNhanHang = false } = data;
    if (!ncc || !soHoaDon || tienHang === undefined || tienHang === null) {
        throw new Error("Thiếu thông tin bắt buộc của hóa đơn mua hàng");
    }
    if (!(await NhaCungCap.exists({ _id: ncc }))) throw new Error("Không tìm thấy nhà cung cấp");
    const kyHieu = (data.kyHieu || "").trim().toUpperCase();
    if (await HoaDonMuaNL.exists({ ncc, soHoaDon: String(soHoaDon).trim(), kyHieu })) {
        throw new Error(`Hóa đơn ${kyHieu ? kyHieu + " - " : ""}số ${soHoaDon} của nhà cung cấp này đã được nhập`);
    }

    const ngayGhi = ngay ? new Date(ngay) : new Date();
    const period = await periodForPosting(ngayGhi);
    const tien = Math.round(Number(tienHang));
    const thue = vatAmount(tien, data.thueSuat, data.thueGtgtDauVao);
    const hinhThucTT = ["tien_mat", "chuyen_khoan"].includes(data.hinhThucTT) ? data.hinhThucTT : "cong_no";

    const invoice = await HoaDonMuaNL.create({
        ncc, phieuNhap: phieuNhap || null,
        mauSo: (data.mauSo || "").trim(), kyHieu, soHoaDon: String(soHoaDon).trim(),
        ngayHoaDon: data.ngayHoaDon ? new Date(data.ngayHoaDon) : ngayGhi,
        chiTiet: Array.isArray(data.chiTiet) ? data.chiTiet : [],
        tienHang: tien, thueSuat: VAT_RATES.includes(Number(data.thueSuat)) ? Number(data.thueSuat) : (tien ? Math.round((thue / tien) * 100) : 0),
        thueGtgtDauVao: thue, hinhThucTT,
        hanThanhToan: hinhThucTT === "cong_no" && data.hanThanhToan ? new Date(data.hanThanhToan) : null,
        ghiChu: data.ghiChu || "", createdAt: ngayGhi,
    });

    const [tk152, tk1331, tk331, tk111, tk112] = await Promise.all(["152", "1331", "331", "111", "112"].map(getAccountByCode));
    const soHD = `${invoice.kyHieu ? invoice.kyHieu + "-" : ""}${invoice.soHoaDon}`;
    let goodsEntry = null, lastEntry = null;
    if (!daGhiNhanHang && tien > 0) {
        goodsEntry = lastEntry = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "mua_hang", nguonId: invoice._id,
            noiDung: `Mua nguyên vật liệu theo hóa đơn ${soHD}`,
            tkNo: tk152._id, tkCo: tk331._id, soTien: tien,
        });
    }
    if (thue > 0) {
        lastEntry = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "mua_hang", nguonId: invoice._id,
            noiDung: `Thuế GTGT đầu vào theo hóa đơn ${soHD}`,
            tkNo: tk1331._id, tkCo: tk331._id, soTien: thue,
        });
    }

    const tong = tien + thue;
    const payable = await CongNoPhaiTraNCC.create({
        ncc, hoaDonMua: invoice._id, butToan: lastEntry ? lastEntry._id : null,
        soTienNo: tong, createdAt: ngayGhi,
    });
    if (hinhThucTT !== "cong_no" && tong > 0) {
        await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "mua_hang", nguonId: invoice._id,
            noiDung: `Thanh toán ngay hóa đơn ${soHD} bằng ${hinhThucTT === "tien_mat" ? "tiền mặt" : "chuyển khoản"}`,
            tkNo: tk331._id, tkCo: (hinhThucTT === "tien_mat" ? tk111 : tk112)._id, soTien: tong,
        });
        payable.daTra = tong;
        payable.trangThai = "da_thanh_toan";
        await payable.save();
    }
    return { invoice, payable, goodsEntry };
}

// Lập hóa đơn mua với một trong ba cách liên kết phiếu nhập kho:
//   lienKet = "phieu_co_san": gắn với phiếu nhập đã lập (hàng đã ghi sổ, chỉ ghi thêm thuế)
//   lienKet = "tao_phieu":     đồng thời lập phiếu nhập kho từ các dòng hóa đơn (cộng tồn kho)
//   lienKet = "khong":         chỉ ghi nhận hóa đơn (hàng chưa về kho / không theo dõi kho)
async function createInvoiceWithLink(body) {
    const lienKet = body.lienKet || (body.phieuNhap ? "phieu_co_san" : "khong");
    const invoiceFields = {
        mauSo: body.mauSo, kyHieu: body.kyHieu, ngayHoaDon: body.ngayHoaDon,
        hinhThucTT: body.hinhThucTT, hanThanhToan: body.hanThanhToan, ghiChu: body.ghiChu,
    };

    if (lienKet === "tao_phieu") {
        const receipt = await createGoodsReceipt({
            ncc: body.ncc, kho: body.kho, ngayNhap: body.ngay || body.ngayHoaDon,
            nguoiGiao: body.nguoiGiao, nguoiLap: body.nguoiLap, soChungTu: body.soHoaDon,
            dienGiai: body.dienGiai || `Nhập kho theo hóa đơn ${body.soHoaDon}`,
            chiTiet: (body.chiTiet || []).map((l) => ({
                danhMucNL: l.danhMucNL, donViTinh: l.donViTinh,
                soLuongChungTu: l.soLuong, soLuongThucNhap: l.soLuongThucNhap ?? l.soLuong, donGia: l.donGia,
            })),
            thueSuat: body.thueSuat, thueGtgt: body.thueGtgtDauVao,
            hoaDon: invoiceFields,
        });
        return HoaDonMuaNL.findById(receipt.hoaDonMua);
    }

    if (lienKet === "phieu_co_san") {
        const receipt = await PhieuNhapKho.findById(body.phieuNhap);
        if (!receipt) throw new Error("Không tìm thấy phiếu nhập kho");
        if (receipt.hoaDonMua) throw new Error(`Phiếu nhập ${receipt.soPhieu || ""} đã có hóa đơn mua hàng`);
        if (String(receipt.ncc) !== String(body.ncc)) throw new Error("Phiếu nhập kho không thuộc nhà cung cấp đã chọn");
        const chiTiet = (receipt.chiTiet || []).map((l) => ({
            danhMucNL: l.danhMucNL, tenHang: l.tenNL, donViTinh: l.donViTinh,
            soLuong: l.soLuongThucNhap, donGia: l.donGia, thanhTien: l.thanhTien,
        }));
        const tienHang = receipt.chiTiet?.length ? receipt.tienHang : (receipt.tienHang || receipt.tongTien);
        const { invoice } = await createPurchaseInvoice({
            ...invoiceFields, ncc: body.ncc, phieuNhap: receipt._id, soHoaDon: body.soHoaDon,
            tienHang, thueSuat: body.thueSuat, thueGtgtDauVao: body.thueGtgtDauVao,
            chiTiet, ngay: body.ngay || new Date(),
            daGhiNhanHang: !!receipt.butToan,
        });
        receipt.hoaDonMua = invoice._id;
        receipt.soChungTu = invoice.soHoaDon;
        receipt.thueSuat = invoice.thueSuat;
        receipt.thueGtgt = invoice.thueGtgtDauVao;
        receipt.tongTien = receipt.tienHang + invoice.thueGtgtDauVao;
        await receipt.save();
        return invoice;
    }

    // Không liên kết kho
    const chiTiet = (body.chiTiet || [])
        .filter((l) => l.tenHang || l.danhMucNL)
        .map((l) => ({
            danhMucNL: l.danhMucNL || null, tenHang: (l.tenHang || "").trim() || "Hàng hóa", donViTinh: l.donViTinh || "",
            soLuong: Number(l.soLuong) || 0, donGia: Number(l.donGia) || 0,
            thanhTien: Math.round(l.thanhTien ?? (Number(l.soLuong) || 0) * (Number(l.donGia) || 0)),
        }));
    const tienHang = chiTiet.length ? chiTiet.reduce((s, l) => s + l.thanhTien, 0) : Number(body.tienHang);
    const { invoice } = await createPurchaseInvoice({
        ...invoiceFields, ncc: body.ncc, soHoaDon: body.soHoaDon, tienHang,
        thueSuat: body.thueSuat, thueGtgtDauVao: body.thueGtgtDauVao, chiTiet, ngay: body.ngay,
    });
    return invoice;
}

// Xóa hóa đơn mua: xóa bút toán, công nợ; bỏ liên kết với phiếu nhập.
// Hóa đơn được lập cùng phiếu nhập (hàng ghi sổ theo hóa đơn) thì phải xóa phiếu nhập.
async function deletePurchaseInvoice(id, { fromReceipt = false } = {}) {
    const invoice = await HoaDonMuaNL.findById(id);
    if (!invoice) throw new Error("Không tìm thấy hóa đơn mua hàng");
    const receipt = invoice.phieuNhap ? await PhieuNhapKho.findById(invoice.phieuNhap) : null;
    const entries = await ButToan.find({ nguonId: invoice._id });
    const payable = await CongNoPhaiTraNCC.findOne({ hoaDonMua: invoice._id });
    const traNgay = invoice.hinhThucTT !== "cong_no" ? (payable?.soTienNo || 0) : 0;
    if (payable && payable.daTra > traNgay) {
        throw new Error("Hóa đơn đã được thanh toán qua phiếu chi, hãy hủy phiếu chi trước khi xóa");
    }
    const tk152 = await getAccountByCode("152");
    if (!fromReceipt && receipt && entries.some((e) => String(e.tkNo) === String(tk152._id))) {
        throw new Error(`Hóa đơn được lập cùng phiếu nhập ${receipt.soPhieu || "(phiếu cũ)"}, hãy xóa phiếu nhập kho để hoàn tồn kho`);
    }
    await assertEntriesRemovable(entries, "Hóa đơn");

    await removeEntries(entries);
    await CongNoPhaiTraNCC.deleteMany({ hoaDonMua: invoice._id });
    if (receipt && !fromReceipt) {
        receipt.hoaDonMua = null;
        receipt.thueSuat = 0;
        receipt.thueGtgt = 0;
        receipt.tongTien = receipt.tienHang || receipt.tongTien;
        await receipt.save();
    }
    await invoice.deleteOne();
}

// ==================== Phiếu nhập kho ====================
// Số phiếu tự động: PNK-YYYYMM-001
async function nextReceiptNumber(date) {
    const prefix = `PNK-${monthKey(date).replace("-", "")}-`;
    const last = await PhieuNhapKho.findOne({ soPhieu: new RegExp(`^${prefix}`) }).sort({ soPhieu: -1 });
    const n = last ? Number(last.soPhieu.slice(prefix.length)) + 1 : 1;
    return prefix + String(n).padStart(3, "0");
}

// Lập phiếu nhập kho: cộng tồn kho, tính lại giá vốn bình quân, ghi sổ và công nợ.
// `data.hoaDon`: thông tin bổ sung cho hóa đơn mua được lập kèm (ký hiệu, hình thức thanh toán...).
async function createGoodsReceipt(data) {
    const { ncc, kho, ngayNhap, nguoiGiao, nguoiLap, soChungTu, dienGiai, chiTiet, thueSuat } = data;
    if (!ncc) throw new Error("Vui lòng chọn nhà cung cấp");
    if (!Array.isArray(chiTiet) || !chiTiet.length) throw new Error("Phiếu nhập cần ít nhất một dòng nguyên liệu");
    const supplier = await NhaCungCap.findById(ncc);
    if (!supplier) throw new Error("Không tìm thấy nhà cung cấp");

    const ngay = ngayNhap ? new Date(ngayNhap) : new Date();
    await periodForPosting(ngay);

    const lines = [];
    for (const [i, l] of chiTiet.entries()) {
        const material = await DanhMucNL.findById(l.danhMucNL);
        if (!material) throw new Error(`Dòng ${i + 1}: chọn nguyên liệu trong danh mục`);
        const soLuongThucNhap = Number(l.soLuongThucNhap);
        const donGia = Number(l.donGia);
        if (!(soLuongThucNhap > 0)) throw new Error(`Dòng ${i + 1} (${material.tenNL}): số lượng thực nhập phải lớn hơn 0`);
        if (!(donGia >= 0)) throw new Error(`Dòng ${i + 1} (${material.tenNL}): đơn giá không hợp lệ`);
        lines.push({
            material,
            line: {
                danhMucNL: material._id, tenNL: material.tenNL,
                donViTinh: (l.donViTinh || material.donViTinh || "kg").trim(),
                soLuongChungTu: Number(l.soLuongChungTu) || soLuongThucNhap,
                soLuongThucNhap, donGia, thanhTien: Math.round(soLuongThucNhap * donGia),
            },
        });
    }
    const tienHang = lines.reduce((s, x) => s + x.line.thanhTien, 0);
    const rate = VAT_RATES.includes(Number(thueSuat)) ? Number(thueSuat) : 0;
    const thueGtgt = vatAmount(tienHang, rate, data.thueGtgt);
    const soCT = (soChungTu || "").trim();

    // Kiểm tra trùng hóa đơn trước khi thay đổi tồn kho
    const kyHieu = (data.hoaDon?.kyHieu || "").trim().toUpperCase();
    if (soCT && await HoaDonMuaNL.exists({ ncc, soHoaDon: soCT, kyHieu })) {
        throw new Error(`Hóa đơn ${kyHieu ? kyHieu + " - " : ""}số ${soCT} của nhà cung cấp này đã được nhập`);
    }

    const receipt = await PhieuNhapKho.create({
        soPhieu: await nextReceiptNumber(ngay),
        ncc, kho: kho || lines[0].material.kho, ngayNhap: ngay,
        nguoiGiao: nguoiGiao || "", nguoiLap: nguoiLap || "", soChungTu: soCT,
        dienGiai: dienGiai || `Nhập nguyên liệu của ${supplier.tenNCC}`,
        chiTiet: lines.map((x) => x.line),
        tienHang, thueSuat: soCT ? rate : 0, thueGtgt: soCT ? thueGtgt : 0,
        tongTien: tienHang + (soCT ? thueGtgt : 0), createdAt: ngay,
    });

    // Cộng tồn kho và tính lại giá vốn bình quân gia quyền
    for (const { material, line } of lines) {
        const tonCu = material.tonHienTai || 0;
        const giaCu = material.giaVonBinhQuan || 0;
        const tonMoi = Math.round((tonCu + line.soLuongThucNhap) * 1000) / 1000;
        // Kho đang âm (bếp đã nấu vượt tồn) hoặc trống: lấy giá nhập lần này làm giá vốn
        material.giaVonBinhQuan = tonCu > 0 && tonMoi > 0 ? Math.round((tonCu * giaCu + line.thanhTien) / tonMoi) : line.donGia;
        material.tonHienTai = tonMoi;
        if (!material.donViTinh || material.donViTinh === "kg") material.donViTinh = line.donViTinh;
        await material.save();
    }

    // Có hóa đơn: lập hóa đơn mua + công nợ; chưa có hóa đơn: ghi nhận hàng về (Nợ 152 / Có 331)
    if (soCT) {
        const { invoice, goodsEntry } = await createPurchaseInvoice({
            ...(data.hoaDon || {}),
            ncc, phieuNhap: receipt._id, soHoaDon: soCT, tienHang, thueSuat: rate, thueGtgtDauVao: thueGtgt, ngay,
            chiTiet: lines.map(({ line }) => ({
                danhMucNL: line.danhMucNL, tenHang: line.tenNL, donViTinh: line.donViTinh,
                soLuong: line.soLuongChungTu, donGia: line.donGia, thanhTien: line.thanhTien,
            })),
        });
        receipt.hoaDonMua = invoice._id;
        receipt.butToan = goodsEntry ? goodsEntry._id : null;
    } else {
        const period = await getPeriodForDate(ngay);
        const [tk152, tk331] = await Promise.all(["152", "331"].map(getAccountByCode));
        const entry = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngay, nguon: "mua_hang", nguonId: receipt._id,
            noiDung: `Nhập kho nguyên liệu theo phiếu ${receipt.soPhieu} (chưa có hóa đơn)`,
            tkNo: tk152._id, tkCo: tk331._id, soTien: tienHang,
        });
        receipt.butToan = entry._id;
    }
    await receipt.save();

    // Nhà cung cấp đã có danh mục nguyên liệu: bổ sung các nguyên liệu vừa nhập từ họ
    if (supplier.nguyenLieuCungCap?.length) {
        await NhaCungCap.updateOne({ _id: supplier._id }, { $addToSet: { nguyenLieuCungCap: { $each: lines.map((x) => x.material._id) } } });
    }
    return receipt;
}

// Xóa phiếu nhập: hoàn tồn kho, xóa bút toán; hóa đơn mua đi kèm cũng bị xóa
async function deleteGoodsReceipt(id) {
    const receipt = await PhieuNhapKho.findById(id);
    if (!receipt) throw new Error("Không tìm thấy phiếu nhập kho");

    const ownEntries = await ButToan.find({ nguonId: receipt._id });
    await assertEntriesRemovable(ownEntries, "Phiếu nhập");
    if (receipt.hoaDonMua && await HoaDonMuaNL.exists({ _id: receipt.hoaDonMua })) {
        await deletePurchaseInvoice(receipt.hoaDonMua, { fromReceipt: true }); // kiểm tra thanh toán / kỳ khóa
    }

    // Hoàn tồn kho và giá vốn bình quân
    for (const line of receipt.chiTiet || []) {
        const material = await DanhMucNL.findById(line.danhMucNL);
        if (!material) continue;
        const tonCu = material.tonHienTai || 0;
        const tonMoi = Math.round((tonCu - line.soLuongThucNhap) * 1000) / 1000;
        if (tonMoi > 0) {
            const giaTriCon = tonCu * (material.giaVonBinhQuan || 0) - line.thanhTien;
            if (giaTriCon > 0) material.giaVonBinhQuan = Math.round(giaTriCon / tonMoi);
        }
        material.tonHienTai = tonMoi;
        await material.save();
    }

    await removeEntries(ownEntries);
    await receipt.deleteOne();
}

module.exports = {
    createPurchaseInvoice, createInvoiceWithLink, deletePurchaseInvoice,
    createGoodsReceipt, deleteGoodsReceipt, periodForPosting,
    assertEntriesRemovable, removeEntries,
};
