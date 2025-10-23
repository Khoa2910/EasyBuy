// Products Page JavaScript

class ProductsPage {
    constructor() {
        this.currentPage = 1;
        // Show 24 products per page by default (4 per row x 6 rows)
        this.limit = 24;
        
        this.filters = {
            search: '',
            category: null,
            brand: null,
            minPrice: null,
            maxPrice: null,
            sort: 'created_desc'
        };
        this.products = [];
        this.pagination = {};
        this.init();
    }

    init() {
        this.parseUrlParams();
        this.bindEvents();
        this.loadCategories();
        this.loadBrands();
        this.loadProducts();
    }

    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('search')) {
            this.filters.search = urlParams.get('search');
            document.getElementById('filterSearch').value = this.filters.search;
        }
        
        if (urlParams.get('category')) {
            this.filters.category = parseInt(urlParams.get('category'));
        }
        
        if (urlParams.get('sort')) {
            this.filters.sort = urlParams.get('sort');
            const sortEl = document.getElementById('sortSelect');
            if (sortEl) sortEl.value = this.filters.sort;
        }
        
        if (urlParams.get('page')) {
            this.currentPage = parseInt(urlParams.get('page'));
        }
        
        if (urlParams.get('limit')) {
            this.limit = parseInt(urlParams.get('limit'));
            const limitEl = document.getElementById('limitSelect');
            if (limitEl) limitEl.value = this.limit;
        }
    }

    bindEvents() {
        // Search
        document.getElementById('filterSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.search();
            }
        });

        // Sort
        document.getElementById('sortSelect').addEventListener('change', () => {
            this.filters.sort = document.getElementById('sortSelect').value;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Limit (optional control)
        const limitEl = document.getElementById('limitSelect');
        if (limitEl) {
            limitEl.addEventListener('change', () => {
                this.limit = parseInt(limitEl.value);
                this.currentPage = 1;
                this.loadProducts();
            });
        }

        // Price filters
        document.getElementById('minPrice').addEventListener('change', () => {
            this.filters.minPrice = document.getElementById('minPrice').value ? 
                parseFloat(document.getElementById('minPrice').value) : null;
            this.currentPage = 1;
            this.loadProducts();
        });

        document.getElementById('maxPrice').addEventListener('change', () => {
            this.filters.maxPrice = document.getElementById('maxPrice').value ? 
                parseFloat(document.getElementById('maxPrice').value) : null;
            this.currentPage = 1;
            this.loadProducts();
        });
    }

    async loadCategories() {
        try {
            const categories = await app.apiCall('/categories');
            this.renderCategoryFilters(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategoryFilters(categories) {
        const container = document.getElementById('categoryFilters');
        container.innerHTML = categories.map(category => `
            <div class="filter-option">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           value="${category.id}" id="category_${category.id}"
                           ${this.filters.category === category.id ? 'checked' : ''}
                           onchange="productsPage.toggleCategory(${category.id})">
                    <label class="form-check-label" for="category_${category.id}">
                        ${category.name} (${category.product_count})
                    </label>
                </div>
            </div>
        `).join('');
    }

    async loadBrands() {
        try {
            const brands = await app.apiCall('/brands');
            this.renderBrandFilters(brands);
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }

    renderBrandFilters(brands) {
        const container = document.getElementById('brandFilters');
        container.innerHTML = brands.map(brand => `
            <div class="filter-option">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           value="${brand.id}" id="brand_${brand.id}"
                           ${this.filters.brand === brand.id ? 'checked' : ''}
                           onchange="productsPage.toggleBrand(${brand.id})">
                    <label class="form-check-label" for="brand_${brand.id}">
                        ${brand.name} (${brand.product_count})
                    </label>
                </div>
            </div>
        `).join('');
    }

    toggleCategory(categoryId) {
        if (this.filters.category === categoryId) {
            this.filters.category = null;
        } else {
            this.filters.category = categoryId;
        }
        this.currentPage = 1;
        this.loadProducts();
    }

    toggleBrand(brandId) {
        if (this.filters.brand === brandId) {
            this.filters.brand = null;
        } else {
            this.filters.brand = brandId;
        }
        this.currentPage = 1;
        this.loadProducts();
    }

    search() {
        this.filters.search = document.getElementById('filterSearch').value.trim();
        this.currentPage = 1;
        this.loadProducts();
    }

    clearFilters() {
        this.filters = {
            search: '',
            category: null,
            brand: null,
            minPrice: null,
            maxPrice: null,
            sort: 'created_desc'
        };
        
        // Reset form elements
        document.getElementById('filterSearch').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('sortSelect').value = 'created_desc';
        
        // Uncheck all checkboxes
        document.querySelectorAll('#categoryFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#brandFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        this.currentPage = 1;
        this.loadProducts();
    }

    async loadProducts() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                sort: this.filters.sort
            });

            if (this.filters.search) params.append('search', this.filters.search);
            if (this.filters.category) params.append('category_id', this.filters.category);
            if (this.filters.brand) params.append('brand_id', this.filters.brand);
            if (this.filters.minPrice) params.append('minPrice', this.filters.minPrice);
            if (this.filters.maxPrice) params.append('maxPrice', this.filters.maxPrice);

            const response = await app.apiCall(`/products?${params.toString()}`);
            
            this.products = response.products;
            this.pagination = response.pagination;
            
            this.renderProducts();
            this.renderPagination();
            this.updateResultsInfo();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNoResults();
        } finally {
            this.showLoading(false);
        }
    }

    renderProducts() {
        const container = document.getElementById('productsGrid');
        
        if (this.products.length === 0) {
            this.showNoResults();
            return;
        }

        container.innerHTML = this.products.map(product => `
            <div class="col-3 mb-4">
                <div class="card product-card h-100">
                    <div class="position-relative">
                        <a href="product-detail.html?id=${product.id}">
                            <img src="${product.primary_image || 'assets/images/placeholder.jpg'}" 
                                 class="card-img-top product-image" alt="${product.name}">
                        </a>
                        ${product.is_on_sale ? '<span class="badge badge-sale product-badge">Giảm giá</span>' : ''}
                        ${product.is_new ? '<span class="badge badge-new product-badge">Mới</span>' : ''}
                        ${product.is_bestseller ? '<span class="badge badge-bestseller product-badge">Bán chạy</span>' : ''}
                        <div class="position-absolute top-0 end-0 p-2">
                            <button class="btn btn-sm btn-light rounded-circle" 
                                    onclick="app.toggleWishlist(${product.id})"
                                    title="Thêm vào yêu thích">
                                <i class="fas fa-heart ${app.wishlist.includes(product.id) ? 'text-danger' : ''}"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">
                            <a href="product-detail.html?id=${product.id}" class="text-decoration-none text-dark">
                                ${product.name}
                            </a>
                        </h6>
                        <div class="product-rating mb-2">
                            ${this.renderRating(product.rating_average)}
                            <small class="text-muted">(${product.rating_count})</small>
                        </div>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="product-price">
                                    ${app.formatPrice(product.sale_price || product.price)}
                                    ${product.compare_price ? `<small class="product-old-price ms-2">${app.formatPrice(product.compare_price)}</small>` : ''}
                                </div>
                            </div>
                            <button class="btn btn-primary w-100" 
                                    onclick="app.addToCart(${product.id})">
                                <i class="fas fa-shopping-cart me-2"></i>Thêm vào giỏ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRating(rating) {
        const value = Number(rating) || 0;
        const clamped = Math.max(0, Math.min(5, value));
        const fullStars = Math.floor(clamped);
        const hasHalfStar = clamped % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let html = '';
        for (let i = 0; i < fullStars; i++) {
            html += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            html += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            html += '<i class="far fa-star"></i>';
        }
        return html;
    }

    renderPagination() {
        const container = document.getElementById('pagination');
        
        if (this.pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        const currentPage = this.pagination.page;
        const totalPages = this.pagination.pages;

        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="productsPage.goToPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="productsPage.goToPage(1)">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="productsPage.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" onclick="productsPage.goToPage(${totalPages})">${totalPages}</a></li>`;
        }

        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="productsPage.goToPage(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        container.innerHTML = html;
    }

    goToPage(page) {
        if (page < 1 || page > this.pagination.pages) return;
        
        this.currentPage = page;
        this.loadProducts();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateResultsInfo() {
        const title = document.getElementById('resultsTitle');
        const count = document.getElementById('resultsCount');
        
        let titleText = 'Tất cả sản phẩm';
        if (this.filters.search) {
            titleText = `Kết quả tìm kiếm cho "${this.filters.search}"`;
        } else if (this.filters.category) {
            // Find category name
            const categoryCheckbox = document.querySelector(`#categoryFilters input[value="${this.filters.category}"]`);
            if (categoryCheckbox) {
                const categoryName = categoryCheckbox.nextElementSibling.textContent.split(' (')[0];
                titleText = categoryName;
            }
        }
        
        title.textContent = titleText;
        count.textContent = `Hiển thị ${this.products.length} trong ${this.pagination.total} sản phẩm`;
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        const grid = document.getElementById('productsGrid');
        const noResults = document.getElementById('noResults');
        
        if (show) {
            spinner.style.display = 'block';
            grid.style.display = 'none';
            noResults.style.display = 'none';
        } else {
            spinner.style.display = 'none';
            // Restore default Bootstrap .row display (flex)
            grid.style.display = '';
        }
    }

    showNoResults() {
        const grid = document.getElementById('productsGrid');
        const noResults = document.getElementById('noResults');
        
        grid.style.display = 'none';
        noResults.style.display = 'block';
    }
}

// Initialize products page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productsPage = new ProductsPage();
});

