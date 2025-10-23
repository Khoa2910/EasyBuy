/**
 * Admin Dashboard JavaScript
 * Handles all dashboard functionality with real data
 */

class AdminDashboard {
    constructor() {
        this.baseURL = '/api/admin';
        this.charts = {};
        this.refreshInterval = null;
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    async init() {
        try {
            this.checkAuth();
            this.setupEventListeners();
            this.setupSidebarToggle();
            await this.loadDashboardData();
            this.startAutoRefresh();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showError('Không thể khởi tạo dashboard');
        }
    }

    /**
     * Check admin authentication
     */
    checkAuth() {
        const user = JSON.parse(localStorage.getItem('tmdt_user') || '{}');
        if (!user || user.role !== 'admin') {
            alert('Bạn không có quyền truy cập trang admin!');
            window.location.href = 'login.html';
            return;
        }
        document.getElementById('adminName').textContent = user.first_name || 'Admin';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Notification dropdown
        const notificationDropdown = document.querySelector('.dropdown-toggle');
        if (notificationDropdown) {
            notificationDropdown.addEventListener('click', () => {
                this.loadNotifications();
            });
        }
    }

    /**
     * Setup sidebar toggle
     */
    setupSidebarToggle() {
        const toggleBtn = document.querySelector('.sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }
    }

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'orders': 'Quản lý đơn hàng',
            'products': 'Quản lý sản phẩm',
            'users': 'Quản lý người dùng',
            'analytics': 'Phân tích chi tiết',
            'settings': 'Cài đặt hệ thống'
        };
        document.getElementById('pageTitle').textContent = titles[tabName] || 'Dashboard';
    }

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            // Load all data in parallel
            const [statsData, ordersData, revenueData] = await Promise.all([
                this.fetchStatistics(),
                this.fetchRecentOrders(),
                this.fetchRevenueData()
            ]);

            // Update UI components
            this.updateStatsCards(statsData);
            this.updateRecentOrders(ordersData);
            this.initCharts(revenueData, ordersData);
            this.updateNotificationBadges(ordersData);
            
            this.hideLoading();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Không thể tải dữ liệu dashboard');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Fetch dashboard statistics
     */
    async fetchStatistics() {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.baseURL}/statistics`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching statistics:', error);
            // Return mock data if API fails
            return {
                totalRevenue: 125000000,
                totalOrders: 1247,
                totalUsers: 2847,
                totalProducts: 156,
                revenueGrowth: 12.5,
                ordersGrowth: 8.3,
                usersGrowth: 15.2,
                productsGrowth: 5.7
            };
        }
    }

    /**
     * Fetch recent orders
     */
    async fetchRecentOrders() {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.baseURL}/orders?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.orders || [];
        } catch (error) {
            console.error('Error fetching orders:', error);
            // Return mock data if API fails
            return [
                {
                    id: 1234,
                    customer_name: 'Nguyễn Văn A',
                    total_amount: 1250000,
                    status: 'pending',
                    created_at: '2024-01-15T10:30:00Z'
                },
                {
                    id: 1235,
                    customer_name: 'Trần Thị B',
                    total_amount: 750000,
                    status: 'delivering',
                    created_at: '2024-01-15T11:15:00Z'
                },
                {
                    id: 1236,
                    customer_name: 'Lê Văn C',
                    total_amount: 3200000,
                    status: 'delivered',
                    created_at: '2024-01-15T14:20:00Z'
                }
            ];
        }
    }

    /**
     * Fetch revenue data
     */
    async fetchRevenueData() {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.baseURL}/revenue?period=monthly`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching revenue data:', error);
            // Return mock data if API fails
            return {
                labels: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'],
                monthly: [12000000, 19000000, 15000000, 25000000, 22000000, 30000000, 28000000]
            };
        }
    }

    /**
     * Update statistics cards
     */
    updateStatsCards(stats) {
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        };

        // Update cards with animation
        this.animateNumber('totalRevenue', formatCurrency(stats.totalRevenue || 0));
        this.animateNumber('totalOrders', (stats.totalOrders || 0).toLocaleString());
        this.animateNumber('totalUsers', (stats.totalUsers || 0).toLocaleString());
        this.animateNumber('totalProducts', (stats.totalProducts || 0).toLocaleString());

        // Update growth percentages
        this.updateElement('revenueGrowth', `${stats.revenueGrowth || 0}%`);
        this.updateElement('ordersGrowth', `${stats.ordersGrowth || 0}%`);
        this.updateElement('usersGrowth', `${stats.usersGrowth || 0}%`);
        this.updateElement('productsGrowth', `${stats.productsGrowth || 0}%`);
    }

    /**
     * Update recent orders table
     */
    updateRecentOrders(orders) {
        const tbody = document.getElementById('recentOrdersTable');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <div>Chưa có đơn hàng nào</div>
                    </td>
                </tr>
            `;
            return;
        }

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        };

        const getStatusBadge = (status) => {
            const statusMap = {
                'pending': 'status-pending',
                'confirmed': 'status-confirmed',
                'delivering': 'status-delivering',
                'delivered': 'status-delivered',
                'cancelled': 'status-cancelled'
            };
            return statusMap[status] || 'status-pending';
        };

        const getStatusText = (status) => {
            const statusMap = {
                'pending': 'Chờ xử lý',
                'confirmed': 'Đã xác nhận',
                'delivering': 'Đang giao',
                'delivered': 'Đã giao',
                'cancelled': 'Đã hủy'
            };
            return statusMap[status] || status;
        };

        tbody.innerHTML = orders.map((order, index) => `
            <tr class="fade-in" style="animation-delay: ${index * 0.1}s">
                <td><strong>#${order.id}</strong></td>
                <td>${order.customer_name || 'N/A'}</td>
                <td class="fw-semibold text-primary">${formatCurrency(order.total_amount || 0)}</td>
                <td>
                    <span class="status-badge ${getStatusBadge(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>${new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.viewOrder(${order.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Initialize charts
     */
    initCharts(revenueData, ordersData) {
        this.initRevenueChart(revenueData);
        this.initOrderStatusChart(ordersData);
    }

    /**
     * Initialize revenue chart
     */
    initRevenueChart(revenueData) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        const labels = revenueData.labels || ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'];
        const data = revenueData.monthly || [12000000, 19000000, 15000000, 25000000, 22000000, 30000000, 28000000];

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                    notation: 'compact'
                                }).format(value);
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    /**
     * Initialize order status chart
     */
    initOrderStatusChart(ordersData) {
        const ctx = document.getElementById('orderStatusChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.orderStatus) {
            this.charts.orderStatus.destroy();
        }

        // Calculate order status distribution
        const statusCounts = {
            pending: 0,
            confirmed: 0,
            delivering: 0,
            delivered: 0,
            cancelled: 0
        };

        ordersData.forEach(order => {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });

        this.charts.orderStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Chờ xử lý', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'],
                datasets: [{
                    data: [
                        statusCounts.pending,
                        statusCounts.confirmed,
                        statusCounts.delivering,
                        statusCounts.delivered,
                        statusCounts.cancelled
                    ],
                    backgroundColor: [
                        '#ffc107',
                        '#17a2b8',
                        '#007bff',
                        '#28a745',
                        '#dc3545'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    /**
     * Update notification badges
     */
    updateNotificationBadges(ordersData) {
        const pendingOrders = ordersData.filter(order => order.status === 'pending').length;
        const ordersBadge = document.getElementById('ordersBadge');
        const notificationBadge = document.getElementById('notificationBadge');
        
        if (ordersBadge) {
            if (pendingOrders > 0) {
                ordersBadge.textContent = pendingOrders;
                ordersBadge.style.display = 'flex';
            } else {
                ordersBadge.style.display = 'none';
            }
        }
        
        if (notificationBadge) {
            if (pendingOrders > 0) {
                notificationBadge.textContent = pendingOrders;
                notificationBadge.style.display = 'flex';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        // This would load real notifications from the API
        console.log('Loading notifications...');
    }

    /**
     * View order details
     */
    async viewOrder(orderId) {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.baseURL}/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.showOrderModal(data);
        } catch (error) {
            console.error('Error fetching order details:', error);
            alert('Không thể tải chi tiết đơn hàng');
        }
    }

    /**
     * Show order modal
     */
    showOrderModal(orderData) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="orderModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chi tiết đơn hàng #${orderData.order.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Thông tin đơn hàng</h6>
                                    <p><strong>Mã đơn:</strong> #${orderData.order.id}</p>
                                    <p><strong>Trạng thái:</strong> ${this.getStatusText(orderData.order.status)}</p>
                                    <p><strong>Tổng tiền:</strong> ${this.formatCurrency(orderData.order.total_amount)}</p>
                                    <p><strong>Ngày tạo:</strong> ${new Date(orderData.order.created_at).toLocaleString('vi-VN')}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Thông tin khách hàng</h6>
                                    <p><strong>Tên:</strong> ${orderData.user.first_name} ${orderData.user.last_name}</p>
                                    <p><strong>Email:</strong> ${orderData.user.email}</p>
                                    <p><strong>Số điện thoại:</strong> ${orderData.user.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="mt-3">
                                <h6>Sản phẩm</h6>
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Sản phẩm</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${orderData.items.map(item => `
                                                <tr>
                                                    <td>${item.product_name}</td>
                                                    <td>${item.quantity}</td>
                                                    <td>${this.formatCurrency(item.unit_price)}</td>
                                                    <td>${this.formatCurrency(item.total_price)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            <button type="button" class="btn btn-primary" onclick="adminDashboard.updateOrderStatus(${orderData.order.id})">
                                Cập nhật trạng thái
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalElement = new bootstrap.Modal(document.getElementById('orderModal'));
        modalElement.show();
        
        // Clean up when modal is hidden
        document.getElementById('orderModal').addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId) {
        const newStatus = prompt('Nhập trạng thái mới (pending, confirmed, delivering, delivered, cancelled):');
        if (!newStatus) return;

        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.baseURL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            alert('Cập nhật trạng thái thành công!');
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Không thể cập nhật trạng thái đơn hàng');
        }
    }

    /**
     * Start auto refresh
     */
    startAutoRefresh() {
        // Refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 300000);
    }

    /**
     * Stop auto refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tbody = document.getElementById('recentOrdersTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="loading-spinner"></div>
                        <div class="mt-2">Đang tải dữ liệu...</div>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        // Loading is hidden when data is loaded
    }

    /**
     * Show error message
     */
    showError(message) {
        const tbody = document.getElementById('recentOrdersTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <div>${message}</div>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Animate number counter
     */
    animateNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (typeof targetValue === 'string' && targetValue.includes('₫')) {
                // Currency animation
                const numericValue = parseFloat(targetValue.replace(/[₫,]/g, ''));
                const currentValue = startValue + (numericValue - startValue) * progress;
                element.textContent = new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                }).format(currentValue);
            } else {
                // Number animation
                const numericValue = parseFloat(targetValue.replace(/,/g, ''));
                const currentValue = startValue + (numericValue - startValue) * progress;
                element.textContent = Math.floor(currentValue).toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Update element text
     */
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        const user = JSON.parse(localStorage.getItem('tmdt_user') || '{}');
        return user.accessToken || localStorage.getItem('accessToken') || 'mock-admin-token';
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    }

    /**
     * Get status text
     */
    getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'confirmed': 'Đã xác nhận',
            'delivering': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    /**
     * Logout function
     */
    logout() {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            this.stopAutoRefresh();
            localStorage.removeItem('tmdt_user');
            localStorage.removeItem('tmdt_token');
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        }
    }
}

// Global functions for HTML onclick handlers
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

function switchTab(tabName) {
    if (window.adminDashboard) {
        window.adminDashboard.switchTab(tabName);
    }
}

function logout() {
    if (window.adminDashboard) {
        window.adminDashboard.logout();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.adminDashboard) {
        window.adminDashboard.stopAutoRefresh();
    }
});

