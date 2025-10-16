#!/bin/bash

# TMDT E-commerce Platform Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up TMDT E-commerce Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed ✓"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    NODE_VERSION=$(node --version)
    print_status "Node.js $NODE_VERSION is installed ✓"
}

# Check if MySQL is installed
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_warning "MySQL client is not installed. Installing..."
        sudo apt-get update
        sudo apt-get install -y mysql-client
    fi
    
    print_status "MySQL client is installed ✓"
}

# Check if Redis is installed
check_redis() {
    if ! command -v redis-cli &> /dev/null; then
        print_warning "Redis client is not installed. Installing..."
        sudo apt-get update
        sudo apt-get install -y redis-tools
    fi
    
    print_status "Redis client is installed ✓"
}

# Create environment file
setup_environment() {
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        print_warning "Please edit .env file with your configuration before running the application."
    else
        print_status ".env file already exists ✓"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    
    print_status "Installing dependencies for each service..."
    
    # Install dependencies for each service
    for service in api-gateway services/*/; do
        if [ -f "$service/package.json" ]; then
            print_status "Installing dependencies for $(basename $service)..."
            cd "$service"
            npm install
            cd - > /dev/null
        fi
    done
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Create logs directories
    mkdir -p logs
    mkdir -p api-gateway/logs
    for service in services/*/; do
        mkdir -p "$service/logs"
    done
    
    # Create upload directories
    mkdir -p uploads/products
    mkdir -p uploads/categories
    mkdir -p uploads/users
    
    print_status "Directories created ✓"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if MySQL is running
    if ! pgrep -x "mysqld" > /dev/null; then
        print_warning "MySQL is not running. Please start MySQL service:"
        print_warning "sudo systemctl start mysql"
        print_warning "Or use Docker: docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=rootpassword -p 3306:3306 mysql:8.0"
    fi
    
    # Create database if it doesn't exist
    if command -v mysql &> /dev/null; then
        print_status "Creating database..."
        mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tmdt_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || print_warning "Could not create database. Please create it manually."
        
        print_status "Importing database schema..."
        mysql -u root -p tmdt_ecommerce < database/init.sql || print_warning "Could not import schema. Please import it manually."
    fi
}

# Setup Redis
setup_redis() {
    print_status "Setting up Redis..."
    
    # Check if Redis is running
    if ! pgrep -x "redis-server" > /dev/null; then
        print_warning "Redis is not running. Please start Redis service:"
        print_warning "sudo systemctl start redis"
        print_warning "Or use Docker: docker run -d --name redis -p 6379:6379 redis:7-alpine"
    fi
}

# Build Docker images
build_docker_images() {
    print_status "Building Docker images..."
    
    # Build API Gateway
    docker build -t tmdt/api-gateway ./api-gateway
    
    # Build services
    for service in services/*/; do
        if [ -f "$service/Dockerfile" ]; then
            service_name=$(basename $service)
            print_status "Building $service_name image..."
            docker build -t "tmdt/$service_name" "$service"
        fi
    done
    
    print_status "Docker images built ✓"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run unit tests
    npm test || print_warning "Some tests failed"
    
    print_status "Tests completed ✓"
}

# Start services
start_services() {
    print_status "Starting services with Docker Compose..."
    
    # Start database and Redis first
    docker-compose up -d mysql redis
    
    # Wait for services to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start all services
    docker-compose up -d
    
    print_status "Services started ✓"
}

# Check service health
check_health() {
    print_status "Checking service health..."
    
    # Wait for services to start
    sleep 15
    
    # Check API Gateway
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_status "API Gateway is healthy ✓"
    else
        print_warning "API Gateway is not responding"
    fi
    
    # Check Auth Service
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Auth Service is healthy ✓"
    else
        print_warning "Auth Service is not responding"
    fi
    
    # Check Product Service
    if curl -f http://localhost:3003/health > /dev/null 2>&1; then
        print_status "Product Service is healthy ✓"
    else
        print_warning "Product Service is not responding"
    fi
}

# Display final information
display_info() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Start the services: docker-compose up -d"
    echo "3. Access the application: http://localhost:3000"
    echo "4. Access Grafana: http://localhost:3001 (admin/admin)"
    echo "5. Access Prometheus: http://localhost:9090"
    echo ""
    echo "🔧 Useful commands:"
    echo "- View logs: docker-compose logs -f"
    echo "- Stop services: docker-compose down"
    echo "- Restart services: docker-compose restart"
    echo "- Run load tests: npm run test:load"
    echo ""
    echo "📚 Documentation:"
    echo "- README.md - General information"
    echo "- docs/DEPLOYMENT.md - Deployment guide"
    echo "- API documentation: http://localhost:3000/api/docs"
    echo ""
}

# Main execution
main() {
    echo "🏪 TMDT E-commerce Platform Setup"
    echo "================================="
    echo ""
    
    check_docker
    check_nodejs
    check_mysql
    check_redis
    setup_environment
    install_dependencies
    create_directories
    setup_database
    setup_redis
    build_docker_images
    run_tests
    start_services
    check_health
    display_info
}

# Run main function
main "$@"

