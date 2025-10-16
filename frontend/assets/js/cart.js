class CartManager {
    constructor() {
        this.cartItems = [];
        this.subtotal = 0;
        this.itemCount = 0;
        this.selectedItems = [];
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
                            <input class="form-check-input" type="checkbox" id="selectAll" onchange="cart.toggleSelectAll(this.checked)">
                            <label class="form-check-label fw-bold" for="selectAll">
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
                                           id="item-${item.id}" 
                                           value="${item.id}"
                                           onchange="cart.updateSelectedItems()">
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
        const tax = document.getElementById('tax');
        const total = document.getElementById('total');

        if (cartItemCount) {
            cartItemCount.textContent = this.itemCount;
        }

        if (cartSubtotal) {
            cartSubtotal.textContent = this.formatPrice(this.subtotal);
        }

        const shippingCost = this.subtotal > 500000 ? 0 : 30000;
        const taxAmount = this.subtotal * 0.1;
        const totalAmount = this.subtotal + shippingCost + taxAmount;

        if (shipping) {
            shipping.textContent = shippingCost === 0 ? 'Miễn phí' : this.formatPrice(shippingCost);
        }

        if (tax) {
            tax.textContent = this.formatPrice(taxAmount);
        }

        if (total) {
            total.textContent = this.formatPrice(totalAmount);
        }
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
}

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.cart = new CartManager();
});