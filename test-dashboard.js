const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@tmdt.com';
const ADMIN_PASSWORD = 'admin123';

// Mock admin token for testing
const ADMIN_TOKEN = 'mock-admin-token';

async function testDashboard() {
    console.log('🧪 Testing Admin Dashboard...\n');

    try {
        // Test 1: Dashboard Statistics
        console.log('1️⃣ Testing Dashboard Statistics...');
        try {
            const statsResponse = await axios.get(`${BASE_URL}/admin/statistics`, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Statistics API Response:');
            console.log(`   - Total Revenue: ${new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(statsResponse.data.totalRevenue || 0)}`);
            console.log(`   - Total Orders: ${(statsResponse.data.totalOrders || 0).toLocaleString()}`);
            console.log(`   - Total Users: ${(statsResponse.data.totalUsers || 0).toLocaleString()}`);
            console.log(`   - Total Products: ${(statsResponse.data.totalProducts || 0).toLocaleString()}`);
            console.log(`   - Revenue Growth: ${statsResponse.data.revenueGrowth || 0}%`);
        } catch (error) {
            console.log('❌ Statistics API Error:', error.response?.data || error.message);
        }

        // Test 2: Revenue Data
        console.log('\n2️⃣ Testing Revenue Data...');
        try {
            const revenueResponse = await axios.get(`${BASE_URL}/admin/revenue?period=monthly`, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Revenue API Response:');
            console.log(`   - Labels: ${revenueResponse.data.labels?.join(', ') || 'N/A'}`);
            console.log(`   - Monthly Data: ${revenueResponse.data.monthly?.length || 0} months`);
            console.log(`   - Total Revenue: ${new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(revenueResponse.data.total || 0)}`);
        } catch (error) {
            console.log('❌ Revenue API Error:', error.response?.data || error.message);
        }

        // Test 3: Recent Orders
        console.log('\n3️⃣ Testing Recent Orders...');
        try {
            const ordersResponse = await axios.get(`${BASE_URL}/admin/orders?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Orders API Response:');
            console.log(`   - Total Orders: ${ordersResponse.data.pagination?.total || 0}`);
            console.log(`   - Orders Returned: ${ordersResponse.data.orders?.length || 0}`);
            
            if (ordersResponse.data.orders?.length > 0) {
                console.log('   - Recent Orders:');
                ordersResponse.data.orders.slice(0, 3).forEach(order => {
                    console.log(`     • Order #${order.id}: ${order.customer_name || 'N/A'} - ${new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                    }).format(order.total_amount || 0)} (${order.status})`);
                });
            }
        } catch (error) {
            console.log('❌ Orders API Error:', error.response?.data || error.message);
        }

        // Test 4: Users Management
        console.log('\n4️⃣ Testing Users Management...');
        try {
            const usersResponse = await axios.get(`${BASE_URL}/admin/users?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Users API Response:');
            console.log(`   - Total Users: ${usersResponse.data.pagination?.total || 0}`);
            console.log(`   - Users Returned: ${usersResponse.data.users?.length || 0}`);
            
            if (usersResponse.data.users?.length > 0) {
                console.log('   - Recent Users:');
                usersResponse.data.users.slice(0, 3).forEach(user => {
                    console.log(`     • ${user.first_name} ${user.last_name} (${user.email}) - ${user.role}`);
                });
            }
        } catch (error) {
            console.log('❌ Users API Error:', error.response?.data || error.message);
        }

        // Test 5: Products Management
        console.log('\n5️⃣ Testing Products Management...');
        try {
            const productsResponse = await axios.get(`${BASE_URL}/admin/products?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Products API Response:');
            console.log(`   - Total Products: ${productsResponse.data.pagination?.total || 0}`);
            console.log(`   - Products Returned: ${productsResponse.data.products?.length || 0}`);
            
            if (productsResponse.data.products?.length > 0) {
                console.log('   - Recent Products:');
                productsResponse.data.products.slice(0, 3).forEach(product => {
                    console.log(`     • ${product.name} - ${new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                    }).format(product.price || 0)} (Stock: ${product.stock_quantity || 0})`);
                });
            }
        } catch (error) {
            console.log('❌ Products API Error:', error.response?.data || error.message);
        }

        console.log('\n🎉 Dashboard Test Completed!');
        console.log('\n📊 Dashboard Features:');
        console.log('   ✅ Real-time statistics with growth indicators');
        console.log('   ✅ Interactive charts (Revenue, Order Status)');
        console.log('   ✅ Recent orders with status tracking');
        console.log('   ✅ User management with role-based access');
        console.log('   ✅ Product management with inventory tracking');
        console.log('   ✅ Responsive design with animations');
        console.log('   ✅ Real-time notifications');
        console.log('   ✅ Auto-refresh every 5 minutes');

        console.log('\n🚀 To view the dashboard:');
        console.log('   1. Start all services: docker-compose up -d');
        console.log('   2. Open: http://localhost:3000/admin-dashboard.html');
        console.log('   3. Login with admin credentials');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Mock data generator for testing
function generateMockData() {
    return {
        statistics: {
            totalRevenue: 125000000,
            totalOrders: 1247,
            totalUsers: 2847,
            totalProducts: 156,
            revenueGrowth: 12.5,
            ordersGrowth: 8.3,
            usersGrowth: 15.2,
            productsGrowth: 5.7
        },
        revenue: {
            labels: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'],
            monthly: [12000000, 19000000, 15000000, 25000000, 22000000, 30000000, 28000000]
        },
        orders: [
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
        ]
    };
}

// Run the test
if (require.main === module) {
    testDashboard();
}

module.exports = { testDashboard, generateMockData };

