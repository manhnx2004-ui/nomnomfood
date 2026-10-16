const mongoose = require("mongoose");
const Admin = require("./models/Admin");

const MONGODB_URI = "mongodb://127.0.0.1:27017/nomnomfood";

const accounts = [
  { name: "Nguyen Van Ship", email: "shipper@nomnomfood.vn", password: "shipper123", role: "shipper" },
  { name: "Quan ly bep",     email: "manager@nomnomfood.vn", password: "manager123", role: "manager" },
  { name: "Admin NomNom",    email: "admin@nomnomfood.vn",   password: "admin123",   role: "admin"   },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Đã kết nối MongoDB");

  for (const acc of accounts) {
    const exists = await Admin.findOne({ email: acc.email });
    if (exists) {
      console.log(`  Đã tồn tại: ${acc.email} (${exists.role})`);
    } else {
      await Admin.create(acc);
      console.log(`  Đã tạo: ${acc.email} / ${acc.password} [${acc.role}]`);
    }
  }

  await mongoose.disconnect();
  console.log("Xong!");
}

run().catch(console.error);
