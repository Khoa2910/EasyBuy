class CartManager {
    constructor() {
        this.cartItems = [];
        this.subtotal = 0;
        this.itemCount = 0;
        this.selectedItems = [];
        this.selectedVoucher = null;
        this.availableVouchers = [];
        this.selectedItemIds = new Set(); // Track which items are selected
        this.init();
    }

    async init() {
        await this.loadCart();
        this.renderCart();
        this.bindEvents();
    }

    async loadCart() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập để xem giỏ hàng', 'warning');
                return;
            }

            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.cartItems = data.items || [];
                    this.subtotal = data.subtotal || 0;
                    this.itemCount = data.itemCount || 0;
                } else {
                    this.showMessage(data.message || 'Lỗi khi tải giỏ hàng', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi tải giỏ hàng', 'error');
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    renderCart() {
        const cartContainer = document.getElementById('cart-items');
        const cartSummary = document.getElementById('cart-summary');
        const cartCount = document.getElementById('cart-count');


        if (!cartContainer) return;

        if (this.cartItems.length === 0) {
            cartContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Giỏ hàng trống</h4>
                    <p class="text-muted">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
                    <a href="/products.html" class="btn btn-primary">Tiếp tục mua sắm</a>
                </div>
            `;
        } else {
            cartContainer.innerHTML = `
                <div class="row mb-3">
                    <div class="col-12">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="cart.toggleSelectAll()">
                            <label class="form-check-label fw-bold" for="selectAllCheckbox">
                                Chọn tất cả
                            </label>
                        </div>
                    </div>
                </div>
                ${this.cartItems.map(item => `
                    <div class="cart-item border rounded p-3 mb-3" data-item-id="${item.id}">
                        <div class="row align-items-center">
                            <div class="col-md-1">
                                <div class="form-check">
                                    <input class="form-check-input item-checkbox" type="checkbox" 
                                           id="itemCheckbox_${item.id}" 
                                           value="${item.id}"
                                           onchange="cart.toggleItemSelection(${item.id})">
                                </div>
                            </div>
                            <div class="col-md-2">
                                <img src="${item.image || 'assets/images/placeholder.jpg'}" 
                                     alt="${item.productName}" 
                                     class="img-fluid rounded" style="height: 80px; object-fit: cover;">
                            </div>
                            <div class="col-md-3">
                                <h6 class="mb-1">${item.productName}</h6>
                                ${item.variantName ? `<small class="text-muted">${item.variantName}</small>` : ''}
                            </div>
                            <div class="col-md-2">
                                <div class="input-group input-group-sm">
                                    <button class="btn btn-outline-secondary" type="button" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <input type="number" 
                                           class="form-control text-center" 
                                           value="${item.quantity}" 
                                           min="1" 
                                           onchange="cart.updateQuantity(${item.id}, this.value)">
                                    <button class="btn btn-outline-secondary" type="button" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <span class="fw-bold">${this.formatPrice(item.price)}</span>
                            </div>
                            <div class="col-md-1">
                                <span class="fw-bold text-primary">${this.formatPrice(item.total)}</span>
                            </div>
                            <div class="col-md-1">
                                <button class="btn btn-outline-danger btn-sm" onclick="cart.removeItem(${item.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            `;
        }

        // Update summary using existing elements
        this.updateCartSummary();
        
        // Update checkout button
        this.updateCheckoutButton();

        // Update cart count
        if (cartCount) {
            cartCount.textContent = this.itemCount;
        }
    }

    updateCartSummary() {
        const cartItemCount = document.getElementById('cartItemCount');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const shipping = document.getElementById('shipping');
        const total = document.getElementById('total');

        // Calculate subtotal only for selected items
        const selectedSubtotal = this.calculateSelectedSubtotal();
        const selectedItemCount = this.selectedItemIds.size;

        if (cartItemCount) {
            cartItemCount.textContent = selectedItemCount;
        }

        if (cartSubtotal) {
            cartSubtotal.textContent = this.formatPrice(selectedSubtotal);
        }

        const shippingCost = selectedSubtotal > 500000 ? 0 : 30000;
        const voucherDiscount = this.calculateVoucherDiscount(selectedSubtotal);
        const totalAmount = selectedSubtotal + shippingCost - voucherDiscount;

        if (shipping) {
            shipping.textContent = shippingCost === 0 ? 'Miễn phí' : this.formatPrice(shippingCost);
        }

        if (total) {
            total.textContent = this.formatPrice(totalAmount);
        }

        // Update checkout button state
        this.updateCheckoutButton();
    }

    calculateSelectedSubtotal() {
        return this.cartItems
            .filter(item => this.selectedItemIds.has(item.id))
            .reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    async updateQuantity(itemId, newQuantity) {
        try {
            if (newQuantity < 1) {
                await this.removeItem(itemId);
                return;
            }

            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch(`/api/cart/update/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: parseInt(newQuantity) })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    await this.loadCart();
                    this.renderCart();
                    this.showMessage('Đã cập nhật số lượng', 'success');
                } else {
                    this.showMessage(data.message || 'Lỗi khi cập nhật', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi cập nhật', 'error');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async removeItem(itemId) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch(`/api/cart/remove/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    await this.loadCart();
                    this.renderCart();
                    this.showMessage('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
                } else {
                    this.showMessage(data.message || 'Lỗi khi xóa', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi xóa', 'error');
            }
        } catch (error) {
            console.error('Error removing item:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async clearCart() {
        if (!confirm('Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng?')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch('/api/cart/clear', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    await this.loadCart();
                    this.renderCart();
                    this.showMessage('Đã xóa tất cả sản phẩm khỏi giỏ hàng', 'success');
                } else {
                    this.showMessage(data.message || 'Lỗi khi xóa', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi xóa', 'error');
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    checkout() {
        if (this.selectedItems.length === 0) {
            this.showMessage('Vui lòng chọn sản phẩm để thanh toán', 'warning');
            return;
        }

        // Store selected items in sessionStorage
        const selectedItems = this.getSelectedItems();
        sessionStorage.setItem('checkoutItems', JSON.stringify(selectedItems));
        
        // Redirect to checkout page
        window.location.href = '/checkout.html';
    }

    bindEvents() {
        // Auto-save quantity changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="number"]')) {
                const itemId = e.target.closest('.cart-item').dataset.itemId;
                const quantity = parseInt(e.target.value);
                this.updateQuantity(itemId, quantity);
            }
        });
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateSelectedItems();
    }

    updateSelectedItems() {
        const checkboxes = document.querySelectorAll('.item-checkbox:checked');
        this.selectedItems = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        const allCheckboxes = document.querySelectorAll('.item-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = this.selectedItems.length === allCheckboxes.length;
        }
        
        // Update checkout button
        this.updateCheckoutButton();
    }

    updateCheckoutButton() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            if (this.selectedItems.length > 0) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = `Thanh toán (${this.selectedItems.length} sản phẩm)`;
            } else {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'Chọn sản phẩm để thanh toán';
            }
        }
    }

    getSelectedItems() {
        return this.cartItems.filter(item => this.selectedItems.includes(item.id));
    }

    getSelectedSubtotal() {
        const selectedItems = this.getSelectedItems();
        return selectedItems.reduce((total, item) => total + item.total, 0);
    }

    applyCoupon() {
        const couponCode = document.getElementById('couponCode').value;
        const couponMessage = document.getElementById('couponMessage');
        
        if (!couponCode) {
            this.showMessage('Vui lòng nhập mã giảm giá', 'warning');
            return;
        }

        // Mock coupon validation (you can implement real coupon logic later)
        const validCoupons = {
            'WELCOME10': { discount: 0.1, type: 'percentage' },
            'SAVE50K': { discount: 50000, type: 'fixed' },
            'FREESHIP': { discount: 0, type: 'freeship' }
        };

        if (validCoupons[couponCode]) {
            const coupon = validCoupons[couponCode];
            let message = '';
            
            if (coupon.type === 'percentage') {
                message = `Áp dụng giảm giá ${(coupon.discount * 100)}%`;
            } else if (coupon.type === 'fixed') {
                message = `Áp dụng giảm giá ${this.formatPrice(coupon.discount)}`;
            } else if (coupon.type === 'freeship') {
                message = 'Miễn phí vận chuyển';
            }
            
            couponMessage.innerHTML = `<div class="text-success">${message}</div>`;
            this.showMessage('Áp dụng mã giảm giá thành công', 'success');
        } else {
            couponMessage.innerHTML = `<div class="text-danger">Mã giảm giá không hợp lệ</div>`;
            this.showMessage('Mã giảm giá không hợp lệ', 'error');
        }
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Add to page
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove after hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // ===== VOUCHER METHODS =====

    async showVoucherModal() {
        const modal = new bootstrap.Modal(document.getElementById('voucherModal'));
        modal.show();
        await this.loadAvailableVouchers();
    }

    async loadAvailableVouchers() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showError('Vui lòng đăng nhập để sử dụng voucher');
                return;
            }

            const response = await fetch('/api/user/vouchers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            
            if (data.success) {
                this.availableVouchers = data.vouchers;
                this.renderAvailableVouchers();
            } else {
                this.showError('Không thể tải voucher');
            }
        } catch (error) {
            console.error('Error loading vouchers:', error);
            this.showError('Lỗi kết nối');
        }
    }

    renderAvailableVouchers() {
        const container = document.getElementById('availableVouchers');
        
        if (this.availableVouchers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">Bạn chưa có voucher nào</h6>
                    <p class="text-muted">Hãy săn voucher tại trang chủ để nhận ưu đãi!</p>
                    <a href="voucher-hunt.html" class="btn btn-primary">Săn voucher ngay</a>
                </div>
            `;
            return;
        }

        container.innerHTML = this.availableVouchers.map(voucher => `
            <div class="card mb-3 voucher-item" data-voucher-id="${voucher.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1 text-primary">${voucher.name}</h6>
                            <p class="text-muted mb-2">${voucher.description}</p>
                            <div class="d-flex align-items-center">
                                <span class="badge bg-success me-2">
                                    ${voucher.discount_type === 'percentage' ? 
                                        `Giảm ${voucher.discount_value}%` : 
                                        `Giảm ${this.formatPrice(voucher.discount_value)}`
                                    }
                                </span>
                                ${voucher.minimum_amount ? 
                                    `<small class="text-muted">Đơn tối thiểu ${this.formatPrice(voucher.minimum_amount)}</small>` : 
                                    ''
                                }
                            </div>
                            <small class="text-muted">
                                Hết hạn: ${new Date(voucher.expires_at).toLocaleDateString('vi-VN')}
                            </small>
                        </div>
                        <button class="btn btn-outline-primary" onclick="cart.selectVoucher(${voucher.id})">
                            <i class="fas fa-check me-1"></i>Chọn
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    selectVoucher(voucherId) {
        const voucher = this.availableVouchers.find(v => v.id === voucherId);
        if (!voucher) return;

        this.selectedVoucher = voucher;
        this.updateVoucherDisplay();
        this.updateCartSummary();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('voucherModal'));
        modal.hide();
        
        this.showSuccess('Đã áp dụng voucher thành công!');
    }

    removeVoucher() {
        this.selectedVoucher = null;
        this.updateVoucherDisplay();
        this.updateCartSummary();
        this.showSuccess('Đã bỏ voucher');
    }

    updateVoucherDisplay() {
        const selectedVoucherDiv = document.getElementById('selectedVoucher');
        const voucherName = document.getElementById('voucherName');
        const voucherDiscount = document.getElementById('voucherDiscount');

        if (this.selectedVoucher) {
            selectedVoucherDiv.classList.remove('d-none');
            voucherName.textContent = this.selectedVoucher.name;
            
            const discountAmount = this.calculateVoucherDiscount();
            voucherDiscount.textContent = `-${this.formatPrice(discountAmount)}`;
        } else {
            selectedVoucherDiv.classList.add('d-none');
        }
    }

    calculateVoucherDiscount(subtotal = null) {
        if (!this.selectedVoucher) return 0;

        const baseSubtotal = subtotal || this.calculateSelectedSubtotal();
        let discount = 0;

        if (this.selectedVoucher.discount_type === 'percentage') {
            discount = (baseSubtotal * this.selectedVoucher.discount_value) / 100;
        } else {
            discount = this.selectedVoucher.discount_value;
        }

        // Apply maximum discount if set
        if (this.selectedVoucher.maximum_discount && discount > this.selectedVoucher.maximum_discount) {
            discount = this.selectedVoucher.maximum_discount;
        }

        return Math.min(discount, baseSubtotal);
    }

    showError(message) {
        alert('❌ ' + message);
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    // ===== SELECTION METHODS =====

    toggleItemSelection(itemId) {
        if (this.selectedItemIds.has(itemId)) {
            this.selectedItemIds.delete(itemId);
        } else {
            this.selectedItemIds.add(itemId);
        }
        this.updateCartSummary();
        this.updateSelectAllCheckbox();
    }

    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox.checked) {
            // Select all items
            this.cartItems.forEach(item => {
                this.selectedItemIds.add(item.id);
            });
        } else {
            // Deselect all items
            this.selectedItemIds.clear();
        }
        this.updateCartSummary();
        this.updateItemCheckboxes();
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (!selectAllCheckbox) return;

        const totalItems = this.cartItems.length;
        const selectedItems = this.selectedItemIds.size;

        if (selectedItems === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedItems === totalItems) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    updateItemCheckboxes() {
        this.cartItems.forEach(item => {
            const checkbox = document.getElementById(`itemCheckbox_${item.id}`);
            if (checkbox) {
                checkbox.checked = this.selectedItemIds.has(item.id);
            }
        });
    }

    getSelectedItems() {
        return this.cartItems.filter(item => this.selectedItemIds.has(item.id));
    }

    hasSelectedItems() {
        return this.selectedItemIds.size > 0;
    }

    proceedToCheckout() {
        if (!this.hasSelectedItems()) {
            this.showError('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
            return;
        }

        // Store selected items for checkout
        const selectedItems = this.getSelectedItems();
        sessionStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
        
        // Redirect to checkout
        window.location.href = 'checkout.html';
    }

    updateCheckoutButton() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (!checkoutBtn) return;

        if (this.hasSelectedItems()) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = `<i class="fas fa-credit-card me-2"></i>Thanh toán (${this.selectedItemIds.size} sản phẩm)`;
        } else {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = `<i class="fas fa-credit-card me-2"></i>Chọn sản phẩm để thanh toán`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cart = new CartManager();
});