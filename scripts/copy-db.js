// Chép TOÀN BỘ dữ liệu nomnomfood từ MongoDB trên máy lên MongoDB Atlas (hoặc server khác).
//
// Cách chạy (trong thư mục nomnomfood, MongoDB trên máy đang bật):
//   node scripts/copy-db.js "mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/nomnomfood"
//
// An toàn: nếu database đích đã có dữ liệu thì dừng lại, trừ khi thêm --ghi-de ở cuối lệnh.
const { MongoClient } = require("mongoose").mongo;

const SOURCE = process.env.SOURCE_URI || "mongodb://127.0.0.1:27017/nomnomfood";
const TARGET = process.argv[2];
const OVERWRITE = process.argv.includes("--ghi-de");

(async () => {
    if (!TARGET || !/^mongodb(\+srv)?:\/\//.test(TARGET)) {
        console.log('Cách dùng: node scripts/copy-db.js "mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/nomnomfood"');
        process.exit(1);
    }
    const src = await MongoClient.connect(SOURCE);
    const dst = await MongoClient.connect(TARGET);
    const srcDb = src.db();
    const dstDb = dst.db();
    console.log(`Nguồn: ${srcDb.databaseName} (máy này)  →  Đích: ${dstDb.databaseName} (${new URL(TARGET.replace("mongodb+srv", "http")).host})`);
    if (dstDb.databaseName === "test") {
        console.log("Chuỗi kết nối đích chưa có tên database. Thêm /nomnomfood ngay trước dấu ? (vd ...mongodb.net/nomnomfood?retryWrites=true)");
        process.exit(1);
    }

    const existing = (await dstDb.listCollections().toArray()).map((c) => c.name);
    let hasData = false;
    for (const name of existing) if (await dstDb.collection(name).estimatedDocumentCount()) hasData = true;
    if (hasData && !OVERWRITE) {
        console.log("Database đích ĐÃ CÓ dữ liệu. Không chép để tránh mất dữ liệu.");
        console.log("Nếu chắc chắn muốn xóa dữ liệu đích và chép lại, chạy lại lệnh và thêm --ghi-de ở cuối.");
        process.exit(1);
    }

    const collections = (await srcDb.listCollections({ type: "collection" }).toArray()).map((c) => c.name);
    let total = 0;
    for (const name of collections) {
        const docs = await srcDb.collection(name).find({}).toArray();
        if (OVERWRITE) await dstDb.collection(name).deleteMany({});
        for (let i = 0; i < docs.length; i += 500) {
            await dstDb.collection(name).insertMany(docs.slice(i, i + 500), { ordered: false });
        }
        // Chép chỉ mục (unique email, mã giảm giá...)
        for (const idx of await srcDb.collection(name).indexes()) {
            if (idx.name === "_id_") continue;
            const { key, name: idxName, v, ns, ...opts } = idx;
            await dstDb.collection(name).createIndex(key, { name: idxName, ...opts }).catch(() => {});
        }
        total += docs.length;
        console.log(`  ✓ ${name.padEnd(28)} ${docs.length} bản ghi`);
    }
    console.log(`Xong: ${collections.length} bảng, ${total} bản ghi.`);
    console.log("NHỚ đổi mật khẩu tài khoản admin/nhân viên mẫu: node scripts/set-password.js <email> <mật khẩu mới> \"<chuỗi Atlas>\"");
    await src.close();
    await dst.close();
})().catch((err) => {
    console.error("Lỗi:", err.message);
    process.exit(1);
});
