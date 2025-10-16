#!/bin/bash
# VRSS Development Environment Setup Script
# Run this script to set up your local development environment

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  VRSS Social Platform Setup               ║${NC}"
echo -e "${BLUE}║  Development Environment Configuration    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

echo -e "${GREEN}✓ Docker installed${NC}"
echo -e "${GREEN}✓ Docker Compose installed${NC}"
echo ""

# Create necessary directories
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p docker/db/backup
mkdir -p storage/media
mkdir -p backend/logs
mkdir -p frontend/logs
touch storage/media/.gitkeep
touch docker/db/backup/.gitkeep
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created from .env.example${NC}"
    echo -e "${YELLOW}⚠ Please review and update .env with your settings${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ .env file already exists, skipping...${NC}"
    echo ""
fi

# Generate JWT secret if not set
if grep -q "dev_jwt_secret_change_in_production" .env; then
    echo -e "${BLUE}Generating secure JWT secret...${NC}"
    JWT_SECRET=$(openssl rand -hex 64)
    if [ "$(uname)" == "Darwin" ]; then
        # macOS
        sed -i '' "s/dev_jwt_secret_change_in_production/$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/dev_jwt_secret_change_in_production/$JWT_SECRET/" .env
    fi
    echo -e "${GREEN}✓ JWT secret generated${NC}"
    echo ""
fi

# Build Docker images
echo -e "${BLUE}Building Docker images...${NC}"
echo "This may take a few minutes on first run..."
docker-compose build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker images built successfully${NC}"
    echo ""
else
    echo -e "${RED}Error: Failed to build Docker images${NC}"
    exit 1
fi

# Start services
echo -e "${BLUE}Starting services...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services started successfully${NC}"
    echo ""
else
    echo -e "${RED}Error: Failed to start services${NC}"
    exit 1
fi

# Wait for services to be healthy
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Check database health
echo -n "Checking database... "
docker-compose exec -T db pg_isready -U vrss_user -d vrss > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Database not ready yet${NC}"
fi

# Check backend health
echo -n "Checking backend API... "
curl -sf http://localhost:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Backend not ready yet (may take a moment)${NC}"
fi

# Check frontend health
echo -n "Checking frontend... "
curl -sf http://localhost:5173 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not ready yet (may take a moment)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Setup Complete!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Your VRSS development environment is ready!${NC}"
echo ""
echo -e "${YELLOW}Access your application:${NC}"
echo "  Frontend:    http://localhost:5173"
echo "  Backend API: http://localhost:3000"
echo "  Database:    localhost:5432"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  make logs        - View all service logs"
echo "  make stop        - Stop all services"
echo "  make restart     - Restart services"
echo "  make db-shell    - Open database shell"
echo "  make help        - Show all available commands"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Visit http://localhost:5173 to access the frontend"
echo "  2. Check logs with 'make logs' if you encounter issues"
echo "  3. Review docs/DOCKER.md for detailed documentation"
echo ""
echo -e "${BLUE}Happy coding! 🚀${NC}"
