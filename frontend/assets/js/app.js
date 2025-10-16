// EasyBuy - Main Application JavaScript

class TMDTApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.user = null;
        this.cart = [];
        this.wishlist = [];
        this.cartCount = 0;
        this.wishlistCount = 0;
        this.init();
    }

    init() {
        this.loadUser();
        this.loadCart();
        this.loadWishlist();
        this.bindEvents();
        this.loadCategories();
        this.loadFeaturedProducts();
        this.loadBestsellerProducts();
        
        // Don't auto-redirect, let user stay on page
        console.log('App initialized, user status:', this.user ? 'logged in' : 'not logged in');
    }

    bindEvents() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Newsletter form
        const newsletterForm = document.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletter(e));
        }

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    // API Helper Methods
    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const token = localStorage.getItem('accessToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API call failed');
            }
            
            return data;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // User Management
    loadUser() {
        const token = localStorage.getItem('accessToken');
        console.log('Loading user, token exists:', !!token);
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('Token payload:', payload);
                this.user = {
                    id: payload.id,
                    email: payload.email,
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    role: payload.role
                };
                console.log('User loaded:', this.user);
                this.updateUserUI();
            } catch (error) {
                console.error('Error parsing token:', error);
                localStorage.removeItem('accessToken');
                this.user = null;
            }
        } else {
            this.user = null;
        }
    }

    updateUserUI() {
        const userMenu = document.getElementById('user-menu');
        const loginMenu = document.getElementById('login-menu');
        
        if (this.user) {
            if (userMenu) userMenu.style.display = 'block';
            if (loginMenu) loginMenu.style.display = 'none';
        } else {
            if (userMenu) userMenu.style.display = 'none';
            if (loginMenu) loginMenu.style.display = 'block';
        }
    }

    // Cart Management
    async loadCart() {
        try {
            if (!this.user) {
                this.cart = [];
                this.cartCount = 0;
                this.updateCartUI();
                return;
            }

            const data = await this.apiCall('/cart');
            if (data.success) {
                this.cart = data.items || [];
                this.cartCount = data.itemCount || 0;
            } else {
                this.cart = [];
                this.cartCount = 0;
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            this.cart = [];
            this.cartCount = 0;
        }
        this.updateCartUI();
    }

    async addToCart(productId, quantity = 1, variantId = null) {
        try {
            console.log('🛒 Adding to cart:', productId, quantity);
            
            // Temporarily allow adding to cart without login for testing
            // if (!this.user) {
            //     this.showMessage('Vui lòng đăng nhập để thêm vào giỏ hàng', 'warning');
            //     return false;
            // }

            console.log('🛒 Making API call to /cart/add');
            const data = await this.apiCall('/cart/add', {
                method: 'POST',
                body: JSON.stringify({
                    productId: parseInt(productId),
                    quantity: parseInt(quantity),
                    variantId: variantId ? parseInt(variantId) : null
                })
            });

            console.log('🛒 API response:', data);
            
            if (data.success) {
                await this.loadCart();
                this.showMessage('Đã thêm vào giỏ hàng', 'success');
                return true;
            } else {
                console.error('🛒 API error:', data.message);
                this.showMessage(data.message || 'Lỗi khi thêm vào giỏ hàng', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
            return false;
        }
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = this.cartCount;
        }
    }

    // Wishlist Management
    async loadWishlist() {
        try {
            if (!this.user) {
                this.wishlist = [];
                this.wishlistCount = 0;
                this.updateWishlistUI();
                return;
            }

            const data = await this.apiCall('/wishlist');
            if (data.success) {
                this.wishlist = data.items || [];
                this.wishlistCount = data.itemCount || 0;
                this.renderWishlistItems(this.wishlist);
            } else {
                this.wishlist = [];
                this.wishlistCount = 0;
                this.renderWishlistItems([]);
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
            this.wishlist = [];
            this.wishlistCount = 0;
        }
        this.updateWishlistUI();
    }

    async toggleWishlist(productId) {
        try {
            if (!this.user) {
                this.showMessage('Vui lòng đăng nhập để thêm vào danh sách yêu thích', 'warning');
                return false;
            }

            // Check if already in wishlist
            const isInWishlist = this.wishlist.some(item => item.productId === parseInt(productId));
            
            if (isInWishlist) {
                // Remove from wishlist
                const data = await this.apiCall('/wishlist/remove', {
                    method: 'DELETE',
                    body: JSON.stringify({ productId: parseInt(productId) })
                });
                
                if (data.success) {
                    await this.loadWishlist();
                    this.showMessage('Đã xóa khỏi danh sách yêu thích', 'info');
                    return false;
                } else {
                    this.showMessage(data.message || 'Lỗi khi xóa khỏi danh sách yêu thích', 'error');
                    return true;
                }
            } else {
                // Add to wishlist
                const data = await this.apiCall('/wishlist/add', {
                    method: 'POST',
                    body: JSON.stringify({ productId: parseInt(productId) })
                });
                
                if (data.success) {
                    await this.loadWishlist();
                    this.showMessage('Đã thêm vào danh sách yêu thích', 'success');
                    return true;
                } else {
                    this.showMessage(data.message || 'Lỗi khi thêm vào danh sách yêu thích', 'error');
                    return false;
                }
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
            return false;
        }
    }

    updateWishlistUI() {
        const wishlistCount = document.getElementById('wishlistCount');
        if (wishlistCount) {
            wishlistCount.textContent = this.wishlistCount;
        }
    }

    renderWishlistItems(items) {
        const container = document.getElementById('wishlist-items');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-heart fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Danh sách yêu thích trống</h4>
                    <p class="text-muted">Bạn chưa có sản phẩm nào trong danh sách yêu thích</p>
                    <a href="index.html" class="btn btn-primary">Tiếp tục mua sắm</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row">
                ${items.map(item => `
                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <div class="card h-100 product-card" data-product-id="${item.productId}" onclick="window.location.href='product-detail.html?id=${item.productId}'" style="cursor: pointer;">
                            <div class="position-relative">
                                <img src="${item.image}" class="card-img-top" alt="${item.productName}" style="height: 200px; object-fit: cover;">
                                <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" 
                                        onclick="event.stopPropagation(); app.toggleWishlist(${item.productId})" 
                                        title="Xóa khỏi yêu thích">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                            <div class="card-body d-flex flex-column">
                                <h6 class="card-title">${item.productName}</h6>
                                <div class="mt-auto">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        ${item.is_on_sale && item.sale_price ? `
                                            <span class="text-decoration-line-through text-muted">${this.formatPrice(item.price)}</span>
                                            <span class="text-danger fw-bold">${this.formatPrice(item.sale_price)}</span>
                                        ` : `
                                            <span class="text-primary fw-bold">${this.formatPrice(item.price)}</span>
                                        `}
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-primary btn-sm flex-fill add-to-cart" 
                                                data-product-id="${item.productId}"
                                                onclick="event.stopPropagation()">
                                            <i class="fas fa-cart-plus me-1"></i>Thêm vào giỏ
                                        </button>
                                        <a href="product-detail.html?id=${item.productId}" 
                                           class="btn btn-outline-primary btn-sm" 
                                           onclick="event.stopPropagation()">
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
    }

    // Product Management
    async loadCategories() {
        try {
            const data = await this.apiCall('/categories');
            console.log('Categories data:', data);
            // API returns array directly, not wrapped in success object
            if (Array.isArray(data)) {
                this.renderCategories(data);
            } else if (data.success && data.categories) {
                this.renderCategories(data.categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategories(categories) {
        const categoriesContainer = document.getElementById('categories-container');
        if (!categoriesContainer) return;

        categoriesContainer.innerHTML = categories.map(category => `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="card h-100 category-card">
                    <div class="card-body text-center">
                        <i class="${category.icon || 'fas fa-tag'} fa-3x text-primary mb-3"></i>
                        <h5 class="card-title">${category.name}</h5>
                        <p class="card-text text-muted">${category.description || ''}</p>
                        <a href="/products.html?category=${category.id}" class="btn btn-outline-primary">
                            Xem sản phẩm
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadFeaturedProducts() {
        try {
            console.log('Loading featured products...');
            const data = await this.apiCall('/products/featured');
            console.log('Featured products data:', data);
            // API returns array directly, not wrapped in success object
            if (Array.isArray(data)) {
                console.log('Rendering featured products (array):', data.length);
                this.renderProducts(data, 'featuredProducts');
            } else if (data.success && data.products) {
                console.log('Rendering featured products (object):', data.products.length);
                this.renderProducts(data.products, 'featuredProducts');
            } else {
                console.log('No featured products found');
            }
        } catch (error) {
            console.error('Error loading featured products:', error);
        }
    }

    async loadBestsellerProducts() {
        try {
            const data = await this.apiCall('/products/bestsellers');
            console.log('Bestseller products data:', data);
            // API returns array directly, not wrapped in success object
            if (Array.isArray(data)) {
                this.renderProducts(data, 'bestsellerProducts');
            } else if (data.success && data.products) {
                this.renderProducts(data.products, 'bestsellerProducts');
            }
        } catch (error) {
            console.error('Error loading bestseller products:', error);
        }
    }

    renderProducts(products, containerId) {
        const container = document.getElementById(containerId);
        console.log(`Rendering products to container: ${containerId}`, container);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="card h-100 product-card" data-product-id="${product.id}" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;">
                    <div class="position-relative">
                        <img src="${product.imageUrl || 'assets/images/placeholder.jpg'}" 
                             class="card-img-top" 
                             alt="${product.name}"
                             style="height: 200px; object-fit: cover;">
                        <div class="position-absolute top-0 end-0 p-2">
                            <button class="btn btn-outline-danger btn-sm add-to-wishlist" 
                                    data-product-id="${product.id}"
                                    title="Thêm vào danh sách yêu thích"
                                    onclick="event.stopPropagation(); if(window.app) window.app.toggleWishlist(${product.id});">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        ${product.isOnSale ? '<span class="badge bg-danger position-absolute top-0 start-0 m-2">Giảm giá</span>' : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">${product.name}</h6>
                        <div class="mt-auto">
                            <div class="d-flex align-items-center mb-2">
                                ${product.isOnSale ? `
                                    <span class="text-danger fw-bold me-2">${this.formatPrice(product.salePrice)}</span>
                                    <span class="text-muted text-decoration-line-through">${this.formatPrice(product.price)}</span>
                                ` : `
                                    <span class="text-primary fw-bold">${this.formatPrice(product.price)}</span>
                                `}
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-primary btn-sm flex-fill add-to-cart" 
                                        data-product-id="${product.id}"
                                        onclick="event.stopPropagation(); if(window.app) window.app.addToCart(${product.id});">
                                    <i class="fas fa-cart-plus me-1"></i>Thêm vào giỏ
                                </button>
                                <a href="product-detail.html?id=${product.id}" 
                                   class="btn btn-outline-primary btn-sm"
                                   onclick="event.stopPropagation()">
                                    <i class="fas fa-eye"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Form Handlers
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const data = await this.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });

            console.log('Login response:', data);

            if (data.accessToken || data.token) {
                // Lưu token với key đúng
                const token = data.accessToken || data.token;
                localStorage.setItem('accessToken', token);
                console.log('Token saved:', token);
                this.user = data.user;
                console.log('User set:', this.user);
                this.updateUserUI();
                await this.loadCart();
                await this.loadWishlist();
                // Login successful - no message needed
                
                // Redirect to intended page or home
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect') || '/';
                console.log('Redirecting to:', redirect);
                window.location.href = redirect;
            } else {
                this.showMessage(data.message || 'Đăng nhập thất bại', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const registerData = {
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phone: formData.get('phone')
        };

        try {
            const data = await this.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(registerData)
            });

            if (data.success) {
                // Registration successful - redirect to login
                e.target.reset();
                window.location.href = 'login-simple.html';
            } else {
                this.showMessage(data.message || 'Đăng ký thất bại', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    async handleSearch(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const query = formData.get('query');
        
        if (query.trim()) {
            window.location.href = `/products.html?search=${encodeURIComponent(query.trim())}`;
        }
    }

    async handleNewsletter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        
        try {
            const data = await this.apiCall('/newsletter/subscribe', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            if (data.success) {
                this.showMessage('Đăng ký nhận tin thành công!', 'success');
                e.target.reset();
            } else {
                this.showMessage(data.message || 'Đăng ký thất bại', 'error');
            }
        } catch (error) {
            console.error('Newsletter error:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    // Utility Methods
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

    logout() {
        localStorage.removeItem('accessToken');
        this.user = null;
        this.cart = [];
        this.wishlist = [];
        this.cartCount = 0;
        this.wishlistCount = 0;
        this.updateUserUI();
        this.updateCartUI();
        this.updateWishlistUI();
        // Logout successful - no message needed
        window.location.href = '/';
    }
}

// Global functions
function logout() {
    if (window.app) {
        window.app.logout();
    }
}

// Cart Page Class
class CartPage {
    constructor() {
        this.app = window.app || new TMDTApp();
        this.init();
    }

    async init() {
        console.log('Initializing Cart Page...');
        await this.loadCart();
        this.bindEvents();
    }

    async loadCart() {
        try {
            if (!this.app.user) {
                this.showEmptyCart();
                return;
            }

            const data = await this.app.apiCall('/api/cart');
            if (data.success && data.items.length > 0) {
                this.renderCartItems(data.items);
                this.updateCartSummary(data.subtotal, data.itemCount);
            } else {
                this.showEmptyCart();
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            this.showEmptyCart();
        }
    }

    renderCartItems(items) {
        const container = document.getElementById('cart-items');
        if (!container) return;

        container.innerHTML = items.map(item => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <img src="${item.image}" class="img-fluid rounded" alt="${item.productName}" style="height: 80px; object-fit: cover;">
                        </div>
                        <div class="col-md-4">
                            <h6 class="mb-1">${item.productName}</h6>
                            <p class="text-muted mb-0">ID: ${item.productId}</p>
                        </div>
                        <div class="col-md-2">
                            <div class="input-group">
                                <button class="btn btn-outline-secondary btn-sm" onclick="cartPage.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                                <input type="number" class="form-control text-center" value="${item.quantity}" min="1" onchange="cartPage.updateQuantity(${item.id}, this.value)">
                                <button class="btn btn-outline-secondary btn-sm" onclick="cartPage.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <span class="fw-bold">${this.app.formatPrice(item.price)}</span>
                        </div>
                        <div class="col-md-2">
                            <span class="fw-bold text-primary">${this.app.formatPrice(item.total)}</span>
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-outline-danger btn-sm" onclick="cartPage.removeItem(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCartSummary(subtotal, itemCount) {
        const subtotalElement = document.getElementById('cartSubtotal');
        const itemCountElement = document.getElementById('cartItemCount');
        
        if (subtotalElement) {
            subtotalElement.textContent = this.app.formatPrice(subtotal);
        }
        if (itemCountElement) {
            itemCountElement.textContent = itemCount;
        }
    }

    showEmptyCart() {
        const container = document.getElementById('cart-items');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Giỏ hàng trống</h4>
                    <p class="text-muted">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
                    <a href="index.html" class="btn btn-primary">Tiếp tục mua sắm</a>
                </div>
            `;
        }
    }

    async updateQuantity(itemId, newQuantity) {
        try {
            if (newQuantity < 1) {
                await this.removeItem(itemId);
                return;
            }

            const data = await this.app.apiCall(`/api/cart/update/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    quantity: parseInt(newQuantity)
                })
            });

            if (data.success) {
                await this.loadCart();
                this.app.showMessage('Đã cập nhật số lượng', 'success');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            this.app.showMessage('Lỗi khi cập nhật số lượng', 'error');
        }
    }

    async removeItem(itemId) {
        try {
            const data = await this.app.apiCall(`/api/cart/remove/${itemId}`, {
                method: 'DELETE'
            });

            if (data.success) {
                await this.loadCart();
                this.app.showMessage('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
            }
        } catch (error) {
            console.error('Error removing item:', error);
            this.app.showMessage('Lỗi khi xóa sản phẩm', 'error');
        }
    }

    bindEvents() {
        // Bind any cart-specific events here
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TMDTApp();
    
    // Bind add to cart buttons
    document.addEventListener('click', async (e) => {
        console.log('🖱️ Click detected:', e.target);
        if (e.target.closest('.add-to-cart')) {
            console.log('🛒 Add to cart button clicked!');
            e.preventDefault();
            const productId = e.target.closest('.add-to-cart').dataset.productId;
            console.log('🛒 Product ID:', productId);
            if (productId && window.app) {
                console.log('🛒 Calling addToCart...');
                await window.app.addToCart(productId);
            } else {
                console.error('🛒 Missing productId or app not found');
            }
        }
    });

    // Bind add to wishlist buttons
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.add-to-wishlist')) {
            e.preventDefault();
            const productId = e.target.closest('.add-to-wishlist').dataset.productId;
            if (productId && window.app) {
                await window.app.toggleWishlist(productId);
            }
        }
    });
});