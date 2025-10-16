// Authentication utilities
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuth();
    }

    // Check if user is authenticated
    checkAuth() {
        const token = localStorage.getItem('accessToken');
        return !!token;
    }

    // Get user info
    getUserInfo() {
        try {
            return JSON.parse(localStorage.getItem('userInfo') || '{}');
        } catch (e) {
            return {};
        }
    }

    // Logout function
    logout() {
        console.log('🚪 Logging out...');
        
        // Clear all stored data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('cart');
        
        // Show success message
        alert('Đăng xuất thành công!');
        
        // Redirect to home page
        window.location.href = 'index.html';
    }

    // Update navbar based on auth status
    updateNavbar() {
        const token = localStorage.getItem('accessToken');
        const loginBtn = document.getElementById('loginBtn');
        const userDropdown = document.getElementById('userDropdown');
        const userName = document.getElementById('userName');
        
        if (token) {
            // User is logged in - show dropdown menu
            if (loginBtn) loginBtn.style.display = 'none';
            if (userDropdown) userDropdown.style.display = 'block';
            
            // Try to get user info from token
            const userInfo = this.getUserInfo();
            if (userInfo.firstName && userName) {
                userName.textContent = userInfo.firstName;
            }
        } else {
            // User is not logged in - show login button
            if (loginBtn) loginBtn.style.display = 'block';
            if (userDropdown) userDropdown.style.display = 'none';
            if (loginBtn) {
                loginBtn.href = 'login-simple.html';
                loginBtn.title = 'Đăng nhập';
            }
        }
    }
}

// Global logout function
function logout() {
    const authManager = new AuthManager();
    authManager.logout();
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
    authManager.updateNavbar();
});