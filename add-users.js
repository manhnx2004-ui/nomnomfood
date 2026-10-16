const mongoose = require("mongoose");
const User = require("./models/user");

const MONGODB_URI = "mongodb://127.0.0.1:27017/nomnomfood";

const newUsers = [
  {
    name: "Pham Thi Dung",
    email: "dung.pham@gmail.com",
    password: "123456",
    phone: "0934567890",
    role: "customer",
    addresses: [{ street: "12 Hoang Dieu", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" }],
    createdAt: new Date("2026-01-10"),
  },
  {
    name: "Nguyen Minh Khoa",
    email: "khoa.nguyen@gmail.com",
    password: "123456",
    phone: "0945678901",
    role: "customer",
    addresses: [{ street: "34 Le Van Sy", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" }],
    createdAt: new Date("2026-01-25"),
  },
  {
    name: "Tran Van Hieu",
    email: "hieu.tran@gmail.com",
    password: "123456",
    phone: "0956789012",
    role: "customer",
    addresses: [{ street: "56 Nguyen Tri Phuong", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" }],
    createdAt: new Date("2026-02-05"),
  },
  {
    name: "Le Thi My Linh",
    email: "linh.le@gmail.com",
    password: "123456",
    phone: "0967890123",
    role: "customer",
    addresses: [{ street: "78 Phan Dinh Phung", city: "Can Tho", state: "CT", postalCode: "90000", country: "Viet Nam" }],
    createdAt: new Date("2026-02-18"),
  },
  {
    name: "Hoang Duc Manh",
    email: "manh.hoang@gmail.com",
    password: "123456",
    phone: "0978901234",
    role: "customer",
    addresses: [{ street: "90 Tran Hung Dao", city: "Hai Phong", state: "HP", postalCode: "18000", country: "Viet Nam" }],
    createdAt: new Date("2026-03-02"),
  },
  {
    name: "Bui Thi Ngoc Lan",
    email: "lan.bui@gmail.com",
    password: "123456",
    phone: "0989012345",
    role: "customer",
    addresses: [{ street: "11 Bach Dang", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" }],
    createdAt: new Date("2026-03-15"),
  },
  {
    name: "Do Quang Vinh",
    email: "vinh.do@gmail.com",
    password: "123456",
    phone: "0990123456",
    role: "customer",
    addresses: [{ street: "22 Dien Bien Phu", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" }],
    createdAt: new Date("2026-04-01"),
  },
  {
    name: "Vu Thi Thu Huong",
    email: "huong.vu@gmail.com",
    password: "123456",
    phone: "0901234568",
    role: "customer",
    addresses: [{ street: "33 Ly Thuong Kiet", city: "Hue", state: "TT-Hue", postalCode: "53000", country: "Viet Nam" }],
    createdAt: new Date("2026-04-20"),
  },
  {
    name: "Nguyen Thanh Tung",
    email: "tung.nguyen2@gmail.com",
    password: "123456",
    phone: "0912345679",
    role: "customer",
    addresses: [{ street: "44 Hai Ba Trung", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" }],
    createdAt: new Date("2026-05-08"),
  },
  {
    name: "Phan Thi Bich Ngoc",
    email: "ngoc.phan@gmail.com",
    password: "123456",
    phone: "0923456790",
    role: "customer",
    addresses: [{ street: "55 Nguyen Van Cu", city: "Nha Trang", state: "KH", postalCode: "65000", country: "Viet Nam" }],
    createdAt: new Date("2026-05-22"),
  },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Đã kết nối MongoDB");

  let added = 0;
  for (const u of newUsers) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`  Đã tồn tại: ${u.email}`);
    } else {
      await User.create(u);
      console.log(`  Đã tạo: ${u.name} <${u.email}>`);
      added++;
    }
  }

  console.log(`\nHoàn tất! Đã thêm ${added} tài khoản mới.`);
  console.log("\n--- Danh sách tài khoản (email / mật khẩu) ---");
  for (const u of newUsers) {
    console.log(`  ${u.email.padEnd(30)} / ${u.password}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
