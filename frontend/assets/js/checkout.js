class CheckoutManager {
    constructor() {
        this.selectedItems = [];
        this.addresses = [];
        this.selectedAddress = null;
        this.init();
    }

    async init() {
        // Load selected items from sessionStorage
        this.loadSelectedItems();
        
        // Load user addresses
        await this.loadAddresses();
        
        // Render checkout page
        this.renderSelectedItems();
        this.renderAddresses();
        // Auto-select default or last used address
        this.autoSelectAddress();
        this.calculateTotal();
        
        // Bind events
        this.bindEvents();
    }

    loadSelectedItems() {
        const storedItems = sessionStorage.getItem('checkoutItems');
        if (storedItems) {
            this.selectedItems = JSON.parse(storedItems);
        } else {
            // Redirect back to cart if no items selected
            window.location.href = '/cart.html';
        }
    }

    async loadAddresses() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch('/api/user/addresses', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.addresses = data.addresses || [];
            } else {
                console.log('No addresses found or error loading addresses');
            }
        } catch (error) {
            console.error('Error loading addresses:', error);
        }
    }

    renderSelectedItems() {
        const container = document.getElementById('selectedItems');
        if (!container) return;

        if (this.selectedItems.length === 0) {
            container.innerHTML = '<p class="text-muted">Không có sản phẩm nào được chọn</p>';
            return;
        }

        container.innerHTML = this.selectedItems.map(item => `
            <div class="d-flex align-items-center mb-3">
                <img src="${item.image || 'assets/images/placeholder.jpg'}" 
                     alt="${item.productName}" 
                     class="img-fluid rounded me-3" 
                     style="width: 60px; height: 60px; object-fit: cover;">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${item.productName}</h6>
                    <small class="text-muted">Số lượng: ${item.quantity}</small>
                </div>
                <div class="text-end">
                    <span class="fw-bold">${this.formatPrice(item.total)}</span>
                </div>
            </div>
        `).join('');
    }

    renderAddresses() {
        const container = document.getElementById('savedAddresses');
        if (!container) return;

        if (this.addresses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-map-marker-alt fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">Chưa có địa chỉ nào được lưu</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.addresses.map((address, index) => `
            <div class="address-item border rounded p-3 mb-3 ${address.is_default ? 'border-primary' : ''} ${this.selectedAddress && this.selectedAddress.id === address.id ? 'bg-light border-primary' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            <h6 class="mb-0 me-2">${address.full_name}</h6>
                            <span class="badge bg-primary">${address.phone}</span>
                            ${address.is_default ? '<span class="badge bg-success ms-2">Mặc định</span>' : ''}
                            ${this.selectedAddress && this.selectedAddress.id === address.id ? '<span class="badge bg-primary ms-2"><i class="fas fa-check me-1"></i>Đã chọn</span>' : ''}
                        </div>
                        <p class="text-muted mb-1">${address.address}</p>
                        <small class="text-muted">${address.ward}, ${address.district}, ${address.province}</small>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm" onclick="checkout.selectAddress(${address.id})">
                            <i class="fas fa-check me-1"></i>Chọn
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="checkout.deleteAddress(${address.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Auto-select default address or the last used one stored locally
    autoSelectAddress() {
        if (!this.addresses || this.addresses.length === 0) return;

        const lastId = parseInt(localStorage.getItem('lastSelectedAddressId') || '0');
        let pick = this.addresses.find(a => a.id === lastId);
        if (!pick) {
            pick = this.addresses.find(a => a.is_default) || this.addresses[0];
        }
        this.selectedAddress = pick || null;
        this.updateAddressSelection();
        this.renderAddresses();
    }

    selectAddress(addressId) {
        this.selectedAddress = this.addresses.find(addr => addr.id === addressId);
        if (this.selectedAddress) {
            localStorage.setItem('lastSelectedAddressId', String(this.selectedAddress.id));
        }
        this.updateAddressSelection();
        this.showMessage('Đã chọn địa chỉ nhận hàng', 'success');
    }

    updateAddressSelection() {
        // Remove previous selection
        document.querySelectorAll('.address-item').forEach(item => {
            item.classList.remove('border-primary', 'bg-light');
        });

        // Highlight selected address
        if (this.selectedAddress) {
            const selectedElement = document.querySelector(`[onclick="checkout.selectAddress(${this.selectedAddress.id})"]`);
            if (selectedElement) {
                selectedElement.closest('.address-item').classList.add('border-primary', 'bg-light');
            }
        }
    }

    showAddAddressForm() {
        document.getElementById('addAddressForm').style.display = 'block';
    }

    hideAddAddressForm() {
        document.getElementById('addAddressForm').style.display = 'none';
        document.getElementById('newAddressForm').reset();
    }

    async saveNewAddress() {
        const form = document.getElementById('newAddressForm');
        const formData = new FormData(form);
        
        const addressData = {
            full_name: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            province: document.getElementById('province').value,
            district: document.getElementById('district').value,
            ward: document.getElementById('ward').value,
            is_default: document.getElementById('setAsDefault').checked
        };

        console.log('Saving address data:', addressData);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch('/api/user/addresses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addressData)
            });

            if (response.ok) {
                const data = await response.json();
                this.showMessage('Đã lưu địa chỉ mới', 'success');
                this.hideAddAddressForm();
                await this.loadAddresses();
                this.renderAddresses();
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi lưu địa chỉ', 'error');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async deleteAddress(addressId) {
        if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch(`/api/user/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showMessage('Đã xóa địa chỉ', 'success');
                await this.loadAddresses();
                this.renderAddresses();
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi xóa địa chỉ', 'error');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    calculateTotal() {
        const subtotal = this.selectedItems.reduce((total, item) => total + item.total, 0);
        const shipping = subtotal > 500000 ? 0 : 30000;
        const tax = subtotal * 0.1;
        const total = subtotal + shipping + tax;

        document.getElementById('subtotal').textContent = this.formatPrice(subtotal);
        document.getElementById('shipping').textContent = shipping === 0 ? 'Miễn phí' : this.formatPrice(shipping);
        document.getElementById('tax').textContent = this.formatPrice(tax);
        document.getElementById('total').textContent = this.formatPrice(total);
    }

    async placeOrder() {
        if (!this.selectedAddress) {
            this.showMessage('Vui lòng chọn địa chỉ nhận hàng', 'warning');
            return;
        }

        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const orderNotes = document.getElementById('orderNotes').value;

        const orderData = {
            items: this.selectedItems,
            address_id: this.selectedAddress.id,
            payment_method: paymentMethod,
            notes: orderNotes
        };

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                const data = await response.json();
                this.showMessage('Đặt hàng thành công!', 'success');
                
                // Clear selected items from sessionStorage
                sessionStorage.removeItem('checkoutItems');
                
                // Redirect to order confirmation
                setTimeout(() => {
                    window.location.href = `/order-confirmation.html?orderId=${data.orderId}`;
                }, 2000);
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi đặt hàng', 'error');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    bindEvents() {
        // New address form submission
        document.getElementById('newAddressForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewAddress();
        });
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
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

// Initialize checkout when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.checkout = new CheckoutManager();
});
