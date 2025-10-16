# 📦 Quy trình xử lý đơn hàng

## 🔄 Flow trạng thái (Chỉ đi tiến, không lùi)

```
┌─────────────────┐
│  1. PENDING     │ → Khách đặt hàng thành công
│  Chờ xác nhận   │
└────────┬────────┘
         │ Admin xác nhận ✅ hoặc Hủy ❌
         ↓
┌─────────────────┐
│  2. CONFIRMED   │ → Admin đã kiểm tra hàng trong kho
│  Đã xác nhận    │
└────────┬────────┘
         │ Admin bắt đầu giao ✅ hoặc Hủy ❌
         ↓
┌─────────────────┐
│  3. DELIVERING  │ → Đang vận chuyển đến khách
│  Đang giao hàng │
└────────┬────────┘
         │ Khách nhận hàng & thanh toán ✅
         │ (KHÔNG thể hủy khi đang giao)
         ↓
┌─────────────────┐
│  4. DELIVERED   │ → Đã giao hàng & thanh toán thành công
│  Đã giao hàng   │
└────────┬────────┘
         │ Admin hoàn tất ✅
         ↓
┌─────────────────┐
│  5. COMPLETED   │ → Hoàn tất - Khách có thể đánh giá
│  Hoàn tất       │
└─────────────────┘

         ❌ CANCELLED (Đã hủy)
         └─ Có thể hủy ở: PENDING, CONFIRMED
         └─ KHÔNG thể hủy khi: DELIVERING, DELIVERED, COMPLETED
```

## ✅ Quy tắc chuyển trạng thái

### 1️⃣ PENDING (Chờ xác nhận)
**Có thể chuyển sang:**
- ✅ **CONFIRMED** - Admin xác nhận đơn hàng
- ❌ **CANCELLED** - Admin hoặc khách hủy đơn

**Không thể:**
- Quay lại bất kỳ trạng thái nào
- Chuyển thẳng sang DELIVERING (phải qua CONFIRMED trước)

---

### 2️⃣ CONFIRMED (Đã xác nhận)
**Có thể chuyển sang:**
- ✅ **DELIVERING** - Bắt đầu giao hàng
- ❌ **CANCELLED** - Hủy đơn (lý do: hết hàng, sai thông tin...)

**Không thể:**
- Quay về PENDING
- Chuyển thẳng sang DELIVERED

---

### 3️⃣ DELIVERING (Đang giao hàng)
**Có thể chuyển sang:**
- ✅ **DELIVERED** - Khách đã nhận hàng và thanh toán

**Không thể:**
- ❌ CANCELLED - Không thể hủy khi đang giao
- Quay lại CONFIRMED hoặc PENDING

**Lưu ý:** Nếu giao hàng thất bại, cần liên hệ khách hàng và admin xử lý thủ công.

---

### 4️⃣ DELIVERED (Đã giao hàng)
**Có thể chuyển sang:**
- ✅ **COMPLETED** - Hoàn tất giao dịch

**Không thể:**
- Quay lại bất kỳ trạng thái nào
- Hủy đơn

---

### 5️⃣ COMPLETED (Hoàn tất)
**Không thể thay đổi:**
- ❌ Đơn hàng đã hoàn tất, không thể sửa đổi
- ✅ Khách hàng có thể viết đánh giá sản phẩm

---

### ❌ CANCELLED (Đã hủy)
**Không thể thay đổi:**
- Đơn hàng đã bị hủy, không thể phục hồi

---

## 👨‍💼 Hành động của Admin

### Tại trang Quản lý đơn hàng:
1. **Dropdown chỉ hiển thị trạng thái hợp lệ** - Admin chỉ thấy các option có thể chuyển tiếp
2. **Confirmation dialog** - Hiển thị thông báo xác nhận trước khi cập nhật
3. **Validation** - Hệ thống tự động chặn các thao tác không hợp lệ
4. **Success notification** - Thông báo thành công với hướng dẫn bước tiếp theo

### Các thao tác chi tiết:

#### 📋 Xác nhận đơn hàng (PENDING → CONFIRMED)
```
1. Kiểm tra hàng còn trong kho
2. Xác nhận thông tin khách hàng
3. Nhấn chọn "Đã xác nhận"
4. Xác nhận trong dialog
```

#### 🚚 Bắt đầu giao hàng (CONFIRMED → DELIVERING)
```
1. Chuẩn bị hàng hóa
2. Chọn đơn vị vận chuyển
3. Nhấn chọn "Đang giao hàng"
4. Xác nhận trong dialog
```

#### ✅ Xác nhận đã giao (DELIVERING → DELIVERED)
```
1. Xác nhận khách đã nhận hàng
2. Xác nhận đã thanh toán (nếu COD)
3. Nhấn chọn "Đã giao hàng"
4. Xác nhận trong dialog
```

#### ⭐ Hoàn tất (DELIVERED → COMPLETED)
```
1. Kiểm tra không có khiếu nại
2. Nhấn chọn "Hoàn tất"
3. Khách hàng có thể đánh giá sản phẩm
```

---

## 👤 Trải nghiệm khách hàng

### Xem trạng thái đơn hàng (orders.html):
- **Timeline tracking** - Hiển thị tiến trình đơn hàng bằng visual progress bar
- **Icons & colors** - Phân biệt rõ ràng từng trạng thái
- **Real-time sync** - Cập nhật ngay khi admin thay đổi (cần refresh)

### Hành động của khách:
- **PENDING**: Có thể hủy đơn
- **CONFIRMED**: Có thể hủy đơn (nếu chưa giao)
- **DELIVERING**: Chỉ xem, không thể thao tác
- **DELIVERED**: Chờ admin hoàn tất
- **COMPLETED**: Có thể đánh giá & mua lại

---

## 🛡️ Bảo vệ dữ liệu

### Backend validation (complete-server.js):
```javascript
const validStatuses = [
  'pending', 'confirmed', 'delivering', 
  'delivered', 'completed', 'cancelled'
];
```

### Frontend validation (admin-orders.html):
```javascript
const validTransitions = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['delivering', 'cancelled'],
  'delivering': ['delivered'],
  'delivered': ['completed'],
  'completed': [],
  'cancelled': []
};
```

---

## 📝 Ghi chú quan trọng

1. ⚠️ **Không thể quay lại** - Một khi đã chuyển sang trạng thái mới, không thể quay về trạng thái cũ
2. ⚠️ **Không hủy khi đang giao** - Đảm bảo tính liên tục của quy trình giao hàng
3. ⚠️ **Hoàn tất không thể sửa** - Đơn hàng completed/cancelled là cuối cùng
4. ✅ **Luôn có confirmation** - Mọi thay đổi đều có dialog xác nhận
5. ✅ **Thông báo rõ ràng** - Hướng dẫn rõ bước tiếp theo sau mỗi cập nhật

---

## 🔧 Tech Stack

- **Backend**: Node.js + Express + MySQL
- **Frontend**: Vanilla JavaScript + Bootstrap 5
- **Auth**: JWT tokens
- **Real-time**: Polling (có thể nâng cấp lên WebSocket)

---

**Phiên bản:** 2.0  
**Cập nhật:** 16/10/2025

