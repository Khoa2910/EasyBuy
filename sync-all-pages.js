const fs = require('fs');
const path = require('path');

// Danh sách các trang cần kiểm tra
const pagesToCheck = [
    'index.html',
    'products.html', 
    'cart.html',
    'wishlist.html',
    'profile.html',
    'orders.html',
    'checkout.html',
    'my-vouchers.html',
    'voucher-hunt.html',
    'product-detail.html'
];

// Header chuẩn cần có
const requiredElements = [
    'navbar-custom fixed-top',
    'navbar-brand',
    'navbar-search',
    'wishlistCount',
    'cartCount',
    'userDropdown',
    'loginBtn'
];

console.log('🔍 Kiểm tra đồng bộ giao diện tất cả các trang...\n');

let allPagesSynced = true;

pagesToCheck.forEach(page => {
    const filePath = path.join('frontend', page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${page}: File không tồn tại`);
        allPagesSynced = false;
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let pageStatus = '✅';
    let missingElements = [];
    
    // Kiểm tra các element cần thiết
    requiredElements.forEach(element => {
        if (!content.includes(element)) {
            missingElements.push(element);
            pageStatus = '❌';
        }
    });
    
    console.log(`${pageStatus} ${page}`);
    if (missingElements.length > 0) {
        console.log(`   Thiếu: ${missingElements.join(', ')}`);
        allPagesSynced = false;
    }
});

console.log('\n📊 KẾT QUẢ:');
if (allPagesSynced) {
    console.log('🎉 Tất cả các trang đã đồng bộ giao diện!');
} else {
    console.log('⚠️  Một số trang cần cập nhật giao diện');
}

console.log('\n📋 CÁC TRANG CẦN KIỂM TRA:');
console.log('   ✅ index.html - Trang chủ');
console.log('   ✅ products.html - Sản phẩm');
console.log('   ✅ cart.html - Giỏ hàng');
console.log('   ✅ wishlist.html - Yêu thích');
console.log('   ✅ profile.html - Hồ sơ');
console.log('   ✅ orders.html - Đơn hàng');
console.log('   ✅ checkout.html - Thanh toán');
console.log('   ✅ my-vouchers.html - Kho voucher');
console.log('   ✅ voucher-hunt.html - Săn voucher');
console.log('   ✅ product-detail.html - Chi tiết sản phẩm');

console.log('\n🎯 CÁC TRANG KHÔNG CẦN HEADER:');
console.log('   📝 login-simple.html - Trang đăng nhập');
console.log('   📝 register.html - Trang đăng ký');
console.log('   📝 forgot-password.html - Quên mật khẩu');
console.log('   📝 reset-password.html - Đặt lại mật khẩu');
console.log('   📝 verify-otp.html - Xác thực OTP');
console.log('   📝 chatbot.html - Trang chatbot riêng');
console.log('   📝 admin-*.html - Trang admin riêng');
