// Tạo dữ liệu test cho các kỳ kế toán, mô phỏng đúng cách hệ thống ghi sổ thật:
// mỗi bút toán đều có chứng từ gốc ở module tương ứng và được ghi đúng ngày, đúng kỳ.
//
//   Nghiệp vụ                  Chứng từ gốc                        Bút toán
//   Góp vốn ban đầu            (bút toán thủ công)                 Nợ 111 / Có 411
//   Bán hàng                   Đơn hàng + Hóa đơn bán hàng         Nợ 111 / Có 511
//   Hoàn tiền                  Phiếu hủy đơn/hoàn tiền             Nợ 511 / Có 111
//   Mua nguyên liệu            Hóa đơn mua + Công nợ NCC           Nợ 152, 1331 / Có 331
//   Trả nợ nhà cung cấp        Cập nhật công nợ NCC                Nợ 331 / Có 111
//   Xuất nguyên liệu chế biến  Phiếu xuất + dòng nguyên liệu       Nợ 632 / Có 152
//   Thu chi khác               Phiếu thu/chi                       Nợ 642 / Có 111, Nợ 111 / Có 711
//   Tính lương cuối tháng      Bảng lương từng nhân viên           Nợ 642 / Có 334
//   Trả lương đầu tháng sau    (bút toán thủ công)                 Nợ 334 / Có 111
//   Khấu hao cuối tháng        Khấu hao từng tài sản               Nợ 642 / Có 214
//
// - Chỉ thêm vào kỳ CHƯA có dữ liệu thật (kỳ có dữ liệu thật như Tháng 9 được giữ nguyên).
// - Dữ liệu test cũ được xóa và tạo lại mỗi lần chạy, nên chạy lại không bị trùng.
// - Không thay đổi tồn kho hiện tại của nguyên liệu.
// Chạy:      node seedPeriodData.js
// Xóa hết:   node seedPeriodData.js --xoa

const mongoose = require("mongoose");
const Order = require("./models/Order");
const Product = require("./models/Product");
const User = require("./models/user");
const Transaction = require("./models/Transaction");
const KyKeToan = require("./models/accounting/KyKeToan");
const TKKeToan = require("./models/accounting/TKKeToan");
const ButToan = require("./models/accounting/ButToan");
const HoaDonBanHang = require("./models/accounting/HoaDonBanHang");
const HuyDonHoanTien = require("./models/accounting/HuyDonHoanTien");
const Payment = require("./models/Payment");
const { statusFromOrder } = require("./services/paymentSync");
const HoaDonMuaNL = require("./models/accounting/HoaDonMuaNL");
const CongNoPhaiTraNCC = require("./models/accounting/CongNoPhaiTraNCC");
const NhaCungCap = require("./models/accounting/NhaCungCap");
const DanhMucNL = require("./models/accounting/DanhMucNL");
const PhieuXuatNL = require("./models/accounting/PhieuXuatNL");
const NguyenLieu = require("./models/accounting/NguyenLieu");
const NhanVien = require("./models/accounting/NhanVien");
const BangLuong = require("./models/accounting/BangLuong");
const TaiSanCoDinh = require("./models/accounting/TaiSanCoDinh");
const KhauHao = require("./models/accounting/KhauHao");
const BaoCaoTaiChinh = require("./models/accounting/BaoCaoTaiChinh");
const ThueGTGT = require("./models/accounting/ThueGTGT");
const { seedAccounting } = require("./services/seedAccounting");
const { getPeriodForDate } = require("./services/accountingHelpers");
const { recomputeSoCai } = require("./services/journalService");
const { monthKey, monthRange } = require("./services/periodUtils");

const MONGODB_URI = "mongodb://127.0.0.1:27017/nomnomfood";
const TAG = "[TEST]";
const TAG_RE = /^\[TEST\]/;
const FIRST_MONTH = "2026-05";
const VON_GOP = 200000000;
const CHUAN_GIO_THANG = 208; // giống payrollService
const DAY = 86400000;

// Sinh số ngẫu nhiên cố định để mỗi lần chạy cho cùng kết quả
function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const roundK = (n) => Math.round(n / 1000) * 1000;

function monthsFrom(startKey, endKey) {
    const keys = [];
    let [y, m] = startKey.split("-").map(Number);
    while (`${y}-${String(m).padStart(2, "0")}` <= endKey) {
        keys.push(`${y}-${String(m).padStart(2, "0")}`);
        if (++m > 12) { m = 1; y++; }
    }
    return keys;
}

// ==================== Xóa dữ liệu test ====================
async function removeTestData() {
    const orders = await Order.find({ note: TAG_RE }, "_id");
    const orderIds = orders.map((o) => o._id);
    const invoices = await HoaDonMuaNL.find({ soHoaDon: /^TEST-/ }, "_id");
    const issues = await PhieuXuatNL.find({ lyDoXuat: TAG_RE }, "_id");
    const testEntries = await ButToan.find({ noiDung: TAG_RE });
    // Tờ khai thuế của các kỳ có dữ liệu test được tính lại, nên bút toán thuế đã chốt cũng bị xóa
    const testPeriodIds = [...new Set(testEntries.map((e) => String(e.kyKeToan)))];
    const vats = await ThueGTGT.find({ kyKeToan: { $in: testPeriodIds } }, "butToan");
    const vatEntries = await ButToan.find({ _id: { $in: vats.flatMap((v) => v.butToan) } });
    const entries = testEntries.concat(vatEntries);
    const entryIds = entries.map((e) => e._id);

    await HoaDonBanHang.deleteMany({ order: { $in: orderIds } });
    await HuyDonHoanTien.deleteMany({ order: { $in: orderIds } });
    await Payment.deleteMany({ order: { $in: orderIds } });
    await Order.deleteMany({ _id: { $in: orderIds } });
    await CongNoPhaiTraNCC.deleteMany({ hoaDonMua: { $in: invoices.map((i) => i._id) } });
    await HoaDonMuaNL.deleteMany({ _id: { $in: invoices.map((i) => i._id) } });
    await NguyenLieu.deleteMany({ phieuXuat: { $in: issues.map((i) => i._id) } });
    await PhieuXuatNL.deleteMany({ _id: { $in: issues.map((i) => i._id) } });
    await Transaction.deleteMany({ description: TAG_RE });
    await BangLuong.deleteMany({ butToan: { $in: entryIds } });
    await KhauHao.deleteMany({ butToan: { $in: entryIds } });
    await ButToan.deleteMany({ _id: { $in: entryIds } });

    const touched = new Set(entries.flatMap((e) => [`${e.kyKeToan}|${e.tkNo}`, `${e.kyKeToan}|${e.tkCo}`]));
    for (const key of touched) {
        const [ky, tk] = key.split("|");
        await recomputeSoCai(ky, tk);
    }
    const periodIds = [...new Set(entries.map((e) => String(e.kyKeToan)))];
    await BaoCaoTaiChinh.deleteMany({ kyKeToan: { $in: periodIds } });
    await ThueGTGT.deleteMany({ kyKeToan: { $in: periodIds } });
    console.log(`Đã xóa dữ liệu test cũ: ${orderIds.length} đơn hàng, ${invoices.length} hóa đơn mua, ${entries.length} bút toán`);
    return periodIds;
}

// ==================== Tạo dữ liệu ====================
async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Đã kết nối MongoDB");
    await seedAccounting(); // hệ thống tài khoản, khóa tháng cho kỳ, kỳ tháng hiện tại

    await removeTestData();
    if (process.argv.includes("--xoa")) return;

    const tk = {};
    for (const code of ["111", "152", "1331", "211", "214", "331", "334", "411", "511", "632", "642", "711"]) {
        tk[code] = await TKKeToan.findOne({ soHieuTK: code });
        if (!tk[code]) throw new Error(`Thiếu tài khoản kế toán ${code}`);
    }

    // Danh mục dùng để sinh dữ liệu (bỏ các bản ghi thử nghiệm / giá bất thường)
    const products = await Product.find({ price: { $gt: 0, $lte: 300000 } }, "name price").lean();
    const users = await User.find({ role: { $ne: "admin" } }).lean();
    const suppliers = (await NhaCungCap.find().lean()).filter((s) => !/playwright|test/i.test(s.tenNCC));
    const materials = await DanhMucNL.find({ giaVonBinhQuan: { $gt: 0 } }).lean();
    const employees = await NhanVien.find({ dangLamViec: true, luongCoBan: { $gte: 1000000 } }).lean();
    const assets = await TaiSanCoDinh.find().lean();
    if (!products.length || !users.length) throw new Error("Cần có sản phẩm và người dùng trước (chạy node seed.js)");
    if (!suppliers.length || !materials.length) throw new Error("Cần có nhà cung cấp và nguyên liệu trước (chạy node seedAccountingSamples.js)");

    // Chỉ sinh dữ liệu cho các tháng chưa có dữ liệu thật
    const now = Date.now();
    const months = [];
    const periodByKey = new Map(); // mọi kỳ, để khoản thanh toán rơi sang tháng sau vẫn được ghi sổ
    for (const key of monthsFrom(FIRST_MONTH, monthKey(new Date()))) {
        const period = await getPeriodForDate(monthRange(key).start);
        periodByKey.set(key, period);
        if (await ButToan.exists({ kyKeToan: period._id })) {
            console.log(`- ${period.tenKy}: đã có dữ liệu thật, không sinh thêm nghiệp vụ`);
            continue;
        }
        months.push({ key, period, ...monthRange(key) });
    }
    if (!months.length) return;

    // Mọi bút toán được gom lại rồi ghi một lần; kỳ được chọn theo ngày ghi sổ
    const entries = [];
    const post = (ngayGhi, noiDung, no, co, soTien, nguon, nguonId = null) => {
        const period = periodByKey.get(monthKey(ngayGhi));
        if (!period || ngayGhi.getTime() > now || soTien <= 0) return null;
        const entry = {
            _id: new mongoose.Types.ObjectId(),
            kyKeToan: period._id, ngayGhi, noiDung: `${TAG} ${noiDung}`,
            tkNo: tk[no]._id, tkCo: tk[co]._id, soTien, nguon, nguonId, createdAt: ngayGhi,
        };
        entries.push(entry);
        return entry;
    };

    // --- Góp vốn ban đầu ---
    const first = months[0];
    post(new Date(first.start.getTime() + 8 * 3600000), "Chủ sở hữu góp vốn kinh doanh", "111", "411", VON_GOP, "thu_cong");

    // --- TSCĐ có từ trước: ghi nhận nguyên giá và hao mòn lũy kế tới đầu kỳ đầu tiên ---
    const [fy, fm] = first.key.split("-").map(Number);
    const ngayGhiTS = new Date(first.start.getTime() + 8.5 * 3600000);
    for (const asset of assets) {
        const mua = new Date(asset.ngayMua);
        if (mua >= first.start) continue;
        post(ngayGhiTS, `Ghi nhận TSCĐ chủ sở hữu góp vốn: ${asset.tenTaiSan}`, "211", "411", asset.nguyenGia, "thu_cong", asset._id);
        const thangDaDung = Math.min(asset.thoiGianKhauHaoThang, (fy - mua.getFullYear()) * 12 + (fm - 1 - mua.getMonth()));
        const haoMon = Math.round(asset.nguyenGia / asset.thoiGianKhauHaoThang) * thangDaDung;
        post(ngayGhiTS, `Hao mòn lũy kế đến đầu kỳ của TSCĐ góp vốn: ${asset.tenTaiSan}`, "411", "214", haoMon, "thu_cong", asset._id);
    }

    let invoiceNo = 0;
    for (const mth of months) {
        const { key, period, start, end } = mth;
        const [y, m] = key.split("-").map(Number);
        const rand = rng(y * 100 + m);
        const pick = (arr) => arr[Math.floor(rand() * arr.length)];
        const monthEnded = end.getTime() <= now;
        const lastTime = Math.min(end.getTime(), now);
        const daysInMonth = Math.round((end.getTime() + 1000 - start.getTime()) / DAY);
        const daysSoFar = Math.max(1, Math.ceil((lastTime - start.getTime()) / DAY));
        const at = (day, hour = 9 + rand() * 12) => new Date(start.getTime() + (day - 1) * DAY + hour * 3600000);
        const label = period.tenKy;

        // --- Bán hàng: 9–13 đơn/ngày ---
        const orderDocs = [], invoiceDocs = [];
        let doanhThu = 0;
        for (let day = 1; day <= daysSoFar; day++) {
            const count = 9 + Math.floor(rand() * 5);
            for (let i = 0; i < count; i++) {
                const createdAt = at(day);
                if (createdAt.getTime() > now) continue;
                const items = [];
                const lines = 1 + Math.floor(rand() * 3);
                for (let j = 0; j < lines; j++) {
                    const p = pick(products);
                    items.push({ product: p._id, quantity: 1 + Math.floor(rand() * 3), price: p.price });
                }
                const totalPrice = items.reduce((s, it) => s + it.price * it.quantity, 0);
                const cancelled = rand() < 0.06;
                const user = pick(users);
                const order = {
                    _id: new mongoose.Types.ObjectId(),
                    user: user._id, items, totalPrice,
                    shippingAddress: { receiverName: user.name, receiverPhone: user.phone || "", city: "Hà Nội", country: "Việt Nam" },
                    status: cancelled ? "cancelled" : "completed",
                    paymentStatus: cancelled ? "failed" : "paid",
                    note: `${TAG} Đơn hàng mẫu ${label}`,
                    revenuePosted: !cancelled,
                    createdAt, updatedAt: createdAt,
                };
                orderDocs.push(order);
                if (cancelled) continue;
                post(createdAt, `Doanh thu đơn hàng #${order._id}`, "111", "511", totalPrice, "don_hang", order._id);
                doanhThu += totalPrice;
                invoiceDocs.push({
                    order: order._id,
                    soHoaDon: `HDT${key.replace("-", "")}${String(invoiceDocs.length + 1).padStart(5, "0")}`,
                    tienHang: totalPrice, thueGtgtDauRa: 0, ngayLap: createdAt,
                });
            }
        }

        // --- Hoàn tiền: 2 đơn/tháng ---
        const completed = orderDocs.filter((o) => o.status === "completed");
        const refundDocs = [];
        for (let i = 0; i < 2 && completed.length > 10; i++) {
            const order = completed[Math.floor(rand() * completed.length)];
            if (order.paymentStatus === "refunded") continue;
            const when = new Date(order.createdAt.getTime() + 2 * 3600000);
            const lyDo = pick(["Món giao bị nguội", "Giao thiếu món", "Khách đổi ý, hủy đơn"]);
            const entry = post(when, `Hoàn tiền đơn hàng #${order._id}: ${lyDo}`, "511", "111", order.totalPrice, "hoan_tien", order._id);
            if (!entry) continue;
            order.paymentStatus = "refunded";
            doanhThu -= order.totalPrice;
            refundDocs.push({
                order: order._id, lyDo, soTienHoan: order.totalPrice, butToan: entry._id,
                trangThai: "da_hoan_tien", daXacNhanCK: true, nguoiYeuCau: order.user,
                createdAt: when, updatedAt: when,
            });
        }

        await Order.insertMany(orderDocs);
        // Giao dịch thanh toán của từng đơn, trạng thái đồng bộ theo đơn như hệ thống thật
        const methods = ["cash", "cash", "momo", "momo", "bank_transfer", "card"];
        await Payment.insertMany(orderDocs.map((o, i) => {
            const status = statusFromOrder(o);
            return {
                order: o._id, user: o.user, amount: o.totalPrice, method: pick(methods), status,
                transactionId: `TEST-${key.replace("-", "")}-${String(i + 1).padStart(5, "0")}`,
                paidAt: status === "failed" ? undefined : o.createdAt,
                createdAt: o.createdAt,
            };
        }));
        await HoaDonBanHang.insertMany(invoiceDocs);
        await HuyDonHoanTien.insertMany(refundDocs);

        // --- Mua nguyên liệu (4 hóa đơn/tháng, VAT 8%), trả nợ sau 10 ngày ---
        const giaVonMucTieu = doanhThu * (0.28 + rand() * 0.04);
        for (let i = 0; i < 4; i++) {
            const day = 1 + i * 7;
            const ngay = at(day, 8);
            if (day > daysSoFar || ngay.getTime() > now) break;
            const ncc = suppliers[(i + m) % suppliers.length];
            const tienHang = roundK((giaVonMucTieu / 4) * (1 + rand() * 0.15));
            const thue = roundK(tienHang * 0.08);
            const invoice = await HoaDonMuaNL.create({
                ncc: ncc._id, soHoaDon: `TEST-${key.replace("-", "")}-${String(++invoiceNo).padStart(3, "0")}`,
                tienHang, thueGtgtDauVao: thue, createdAt: ngay,
            });
            post(ngay, `Mua nguyên vật liệu theo hóa đơn ${invoice.soHoaDon}`, "152", "331", tienHang, "mua_hang", invoice._id);
            const vatEntry = post(ngay, `Thuế GTGT đầu vào theo hóa đơn ${invoice.soHoaDon}`, "1331", "331", thue, "mua_hang", invoice._id);
            const payable = await CongNoPhaiTraNCC.create({
                ncc: ncc._id, hoaDonMua: invoice._id, butToan: vatEntry?._id || null,
                soTienNo: tienHang + thue, createdAt: ngay,
            });
            // Thanh toán sau 10 ngày (có thể rơi vào tháng sau); chưa tới hạn thì còn nợ
            const ngayTra = new Date(ngay.getTime() + 10 * DAY + 2 * 3600000);
            const payEntry = post(ngayTra, `Thanh toán công nợ phải trả nhà cung cấp`, "331", "111", tienHang + thue, "mua_hang", payable._id);
            if (payEntry) {
                payable.daTra = tienHang + thue;
                payable.trangThai = "da_thanh_toan";
                await payable.save();
            }
        }

        // --- Xuất nguyên liệu chế biến hằng tuần ---
        for (let i = 0; i < 4; i++) {
            const day = 3 + i * 7;
            const ngay = at(day, 7);
            if (day > daysSoFar || ngay.getTime() > now) break;
            const issue = await PhieuXuatNL.create({
                kho: materials[0].kho, ngayXuat: ngay, createdAt: ngay,
                lyDoXuat: `${TAG} Xuất nguyên liệu chế biến tuần ${i + 1} ${label}`,
            });
            const target = giaVonMucTieu / 4;
            const lineCount = 4 + Math.floor(rand() * 3);
            let tongTien = 0;
            const lines = [];
            for (let j = 0; j < lineCount; j++) {
                const mat = pick(materials);
                const soLuong = Math.max(1, Math.round(target / lineCount / mat.giaVonBinhQuan));
                tongTien += soLuong * mat.giaVonBinhQuan;
                lines.push({ danhMucNL: mat._id, phieuXuat: issue._id, soLuong, createdAt: ngay });
            }
            await NguyenLieu.insertMany(lines);
            const entry = post(ngay, `Xuất nguyên liệu: ${issue.lyDoXuat.replace(TAG + " ", "")}`, "632", "152", tongTien, "mua_hang", issue._id);
            if (entry) { issue.butToan = entry._id; await issue.save(); }
        }

        // --- Phiếu thu/chi ---
        const txDefs = [
            [5, "chi", "Thuê mặt bằng", 8000000, "642"],
            [10, "chi", "Điện nước", roundK(2000000 + rand() * 800000), "642"],
            [15, "chi", "Marketing", roundK(1200000 + rand() * 1000000), "642"],
            [20, "thu", "Doanh thu khác", roundK(300000 + rand() * 700000), "711"],
        ];
        for (const [day, type, category, amount, counter] of txDefs) {
            const date = at(day, 10);
            if (day > daysSoFar || date.getTime() > now) continue;
            const tx = await Transaction.create({
                type, category, amount, date, createdAt: date,
                description: `${TAG} ${category} ${label}`,
            });
            const noiDung = `${type === "thu" ? "Phiếu thu" : "Phiếu chi"}: ${category} - ${label}`;
            const entry = type === "thu"
                ? post(date, noiDung, "111", counter, amount, "thu_chi", tx._id)
                : post(date, noiDung, counter, "111", amount, "thu_chi", tx._id);
            if (entry) { tx.butToan = entry._id; await tx.save(); }
        }

        if (!monthEnded) continue; // lương và khấu hao chỉ tính khi đã hết tháng

        // --- Tính lương cuối tháng, trả lương ngày 5 tháng sau ---
        const ngayTinhLuong = new Date(end.getTime() - 6 * 3600000);
        let tongLuong = 0;
        for (const nv of employees) {
            const tongGioLam = 176 + Math.floor(rand() * 33);
            const luongThucLinh = Math.round(tongGioLam * nv.luongCoBan / CHUAN_GIO_THANG);
            const entry = post(ngayTinhLuong, `Lương tháng: ${nv.hoTen}`, "642", "334", luongThucLinh, "luong", nv._id);
            await BangLuong.create({
                nhanVien: nv._id, kyKeToan: period._id, tongGioLam, luongThucLinh,
                butToan: entry._id, ngayTinh: ngayTinhLuong,
            });
            tongLuong += luongThucLinh;
        }
        post(new Date(end.getTime() + 1000 + 4 * DAY + 9 * 3600000), `Chi trả lương nhân viên ${label}`, "334", "111", tongLuong, "thu_cong");

        // --- Khấu hao cuối tháng ---
        for (const asset of assets) {
            if (new Date(asset.ngayMua) > end) continue;
            const daKhauHao = (y - new Date(asset.ngayMua).getFullYear()) * 12 + (m - 1 - new Date(asset.ngayMua).getMonth());
            if (daKhauHao >= asset.thoiGianKhauHaoThang) continue;
            const soTienKhauHao = Math.round(asset.nguyenGia / asset.thoiGianKhauHaoThang);
            const entry = post(ngayTinhLuong, `Khấu hao TSCĐ: ${asset.tenTaiSan}`, "642", "214", soTienKhauHao, "khau_hao", asset._id);
            await KhauHao.create({
                taiSan: asset._id, kyKeToan: period._id, soTienKhauHao,
                butToan: entry._id, ngayGhiNhan: ngayTinhLuong,
            });
        }
    }

    // --- Ghi sổ, tính lại sổ cái, xóa báo cáo đã lưu để hệ thống tính lại ---
    entries.sort((a, b) => a.ngayGhi - b.ngayGhi);
    await ButToan.insertMany(entries);
    for (const period of periodByKey.values()) {
        const touched = new Set(entries.filter((e) => String(e.kyKeToan) === String(period._id)).flatMap((e) => [String(e.tkNo), String(e.tkCo)]));
        if (!touched.size) continue;
        for (const t of touched) await recomputeSoCai(period._id, t);
        await BaoCaoTaiChinh.deleteMany({ kyKeToan: period._id });
        await ThueGTGT.deleteMany({ kyKeToan: period._id });
    }

    // --- Báo cáo ---
    let tienMat = 0;
    const tk111 = String(tk["111"]._id);
    for (const period of periodByKey.values()) {
        const list = entries.filter((e) => String(e.kyKeToan) === String(period._id));
        if (!list.length) continue;
        const sum = (fn) => list.filter(fn).reduce((s, e) => s + e.soTien, 0);
        const dt = sum((e) => e.tkCo.equals(tk["511"]._id)) - sum((e) => e.tkNo.equals(tk["511"]._id));
        const cp = sum((e) => e.tkNo.equals(tk["632"]._id) || e.tkNo.equals(tk["642"]._id));
        tienMat += sum((e) => String(e.tkNo) === tk111) - sum((e) => String(e.tkCo) === tk111);
        console.log(`+ ${period.tenKy}: ${list.length} bút toán | doanh thu thuần ${dt.toLocaleString("vi-VN")}đ | chi phí ${cp.toLocaleString("vi-VN")}đ | lãi/lỗ ${(dt - cp).toLocaleString("vi-VN")}đ | tiền mặt (test) ${tienMat.toLocaleString("vi-VN")}đ`);
    }
}

main()
    .catch((err) => { console.error("Lỗi:", err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
