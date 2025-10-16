class WishlistManager {
    constructor() {
        this.wishlistItems = [];
        this.itemCount = 0;
        this.init();
    }

    async init() {
        await this.loadWishlist();
        this.renderWishlist();
        this.bindEvents();
    }

    async loadWishlist() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập để xem danh sách yêu thích', 'warning');
                return;
            }

            const response = await fetch('/api/wishlist', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.wishlistItems = data.items || [];
                    this.itemCount = data.itemCount || 0;
                } else {
                    this.showMessage(data.message || 'Lỗi khi tải danh sách yêu thích', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi tải danh sách yêu thích', 'error');
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    renderWishlist() {
        const wishlistContainer = document.getElementById('wishlist-items');
        const clearBtn = document.getElementById('clear-wishlist-btn');
        const wishlistCount = document.getElementById('wishlist-count');

        if (!wishlistContainer) return;

        if (this.wishlistItems.length === 0) {
            wishlistContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-heart fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Danh sách yêu thích trống</h4>
                    <p class="text-muted">Hãy thêm sản phẩm vào danh sách yêu thích để lưu lại những món đồ bạn quan tâm</p>
                    <a href="/products.html" class="btn btn-primary">Khám phá sản phẩm</a>
                </div>
            `;
            if (clearBtn) clearBtn.style.display = 'none';
        } else {
            wishlistContainer.innerHTML = `
                <div class="row">
                    ${this.wishlistItems.map(item => `
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                            <div class="card h-100 product-card" data-product-id="${item.productId}">
                                <div class="position-relative">
                                    <img src="${item.productImage || 'assets/images/placeholder.jpg'}" 
                                         class="card-img-top" 
                                         alt="${item.productName}"
                                         style="height: 200px; object-fit: cover;">
                                    <div class="position-absolute top-0 end-0 p-2">
                                        <button class="btn btn-outline-danger btn-sm" 
                                                onclick="wishlist.removeFromWishlist(${item.productId})"
                                                title="Xóa khỏi danh sách yêu thích">
                                            <i class="fas fa-heart-broken"></i>
                                        </button>
                                    </div>
                                    ${item.isOnSale ? '<span class="badge bg-danger position-absolute top-0 start-0 m-2">Giảm giá</span>' : ''}
                                </div>
                                <div class="card-body d-flex flex-column">
                                    <h6 class="card-title">${item.productName}</h6>
                                    <div class="mt-auto">
                                        <div class="d-flex align-items-center mb-2">
                                            ${item.isOnSale ? `
                                                <span class="text-danger fw-bold me-2">${this.formatPrice(item.price)}</span>
                                                <span class="text-muted text-decoration-line-through">${this.formatPrice(item.originalPrice)}</span>
                                            ` : `
                                                <span class="text-primary fw-bold">${this.formatPrice(item.price)}</span>
                                            `}
                                        </div>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-primary btn-sm flex-fill" 
                                                    onclick="wishlist.addToCart(${item.productId})">
                                                <i class="fas fa-cart-plus me-1"></i>Thêm vào giỏ
                                            </button>
                                            <a href="/product-detail.html?id=${item.productId}" 
                                               class="btn btn-outline-primary btn-sm">
                                                <i class="fas fa-eye"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            if (clearBtn) clearBtn.style.display = 'block';
        }

        // Update wishlist count
        if (wishlistCount) {
            wishlistCount.textContent = this.itemCount;
        }

        // Update global wishlist count
        if (window.app) {
            window.app.loadWishlist();
        }
    }

    async addToWishlist(productId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập để thêm vào danh sách yêu thích', 'warning');
                return;
            }

            const response = await fetch('/api/wishlist', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId: parseInt(productId) })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showMessage('Đã thêm vào danh sách yêu thích', 'success');
                    await this.loadWishlist();
                    this.renderWishlist();
                } else {
                    this.showMessage(data.message || 'Lỗi khi thêm vào danh sách yêu thích', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi thêm vào danh sách yêu thích', 'error');
            }
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async removeFromWishlist(productId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch(`/api/wishlist/remove`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId: parseInt(productId) })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showMessage('Đã xóa khỏi danh sách yêu thích', 'success');
                    await this.loadWishlist();
                    this.renderWishlist();
                } else {
                    this.showMessage(data.message || 'Lỗi khi xóa khỏi danh sách yêu thích', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi xóa khỏi danh sách yêu thích', 'error');
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async addToCart(productId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập để thêm vào giỏ hàng', 'warning');
                return;
            }

            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    productId: parseInt(productId),
                    quantity: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showMessage('Đã thêm vào giỏ hàng', 'success');
                    // Update global cart count
                    if (window.app) {
                        window.app.loadCart();
                    }
                } else {
                    this.showMessage(data.message || 'Lỗi khi thêm vào giỏ hàng', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi thêm vào giỏ hàng', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async clearWishlist() {
        if (!confirm('Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi danh sách yêu thích?')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showMessage('Vui lòng đăng nhập', 'warning');
                return;
            }

            const response = await fetch('/api/wishlist/clear', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showMessage('Đã xóa tất cả sản phẩm khỏi danh sách yêu thích', 'success');
                    await this.loadWishlist();
                    this.renderWishlist();
                } else {
                    this.showMessage(data.message || 'Lỗi khi xóa', 'error');
                }
            } else {
                const errorData = await response.json();
                this.showMessage(errorData.message || 'Lỗi khi xóa', 'error');
            }
        } catch (error) {
            console.error('Error clearing wishlist:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async checkWishlistStatus(productId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return false;

            const response = await fetch(`/api/wishlist/check/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.inWishlist : false;
            }
            return false;
        } catch (error) {
            console.error('Error checking wishlist status:', error);
            return false;
        }
    }

    bindEvents() {
        // Add to wishlist buttons on product cards
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.add-to-wishlist')) {
                e.preventDefault();
                const productId = e.target.closest('.add-to-wishlist').dataset.productId;
                if (productId) {
                    await this.addToWishlist(productId);
                }
            }
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

// Initialize wishlist when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.wishlist = new WishlistManager();
});





