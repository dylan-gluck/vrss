#!/bin/bash
# VRSS Health Check Script
# Verifies all services are running correctly

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  VRSS Health Check                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

OVERALL_STATUS=0

# Check if Docker is running
echo -e "${BLUE}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Check if containers are running
echo -e "${BLUE}Checking container status...${NC}"
CONTAINERS=$(docker-compose ps -q)
if [ -z "$CONTAINERS" ]; then
    echo -e "${RED}✗ No containers are running${NC}"
    echo "Run 'make start' to start the services"
    exit 1
fi

# Check individual services
check_container() {
    local service=$1
    local name=$2

    if docker-compose ps | grep -q "$service.*Up"; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running"
        OVERALL_STATUS=1
        return 1
    fi
}

check_container "db" "Database"
check_container "backend" "Backend API"
check_container "frontend" "Frontend"

echo ""

# Check service health endpoints
echo -e "${BLUE}Checking service health...${NC}"

# Database health
echo -n "Database connectivity: "
if docker-compose exec -T db pg_isready -U vrss_user -d vrss > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
    OVERALL_STATUS=1
fi

# Backend health
echo -n "Backend API health: "
BACKEND_RESPONSE=$(curl -sf http://localhost:3000/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy (Connection failed)${NC}"
    OVERALL_STATUS=1
fi

# Frontend health
echo -n "Frontend health: "
FRONTEND_RESPONSE=$(curl -sf http://localhost:5173 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy (Connection failed)${NC}"
    OVERALL_STATUS=1
fi

echo ""

# Check disk usage
echo -e "${BLUE}Checking resource usage...${NC}"

# Docker disk usage
echo -n "Docker disk usage: "
DOCKER_SIZE=$(docker system df --format "{{.Size}}" | head -n 1 | tr -d ' ')
echo -e "${YELLOW}$DOCKER_SIZE${NC}"

# Volume sizes
echo -n "Database volume: "
DB_VOLUME_SIZE=$(docker system df -v | grep vrss_postgres_data | awk '{print $3}' || echo "Unknown")
echo -e "${YELLOW}$DB_VOLUME_SIZE${NC}"

echo -n "Media volume: "
MEDIA_VOLUME_SIZE=$(docker system df -v | grep vrss_media_storage | awk '{print $3}' || echo "Unknown")
echo -e "${YELLOW}$MEDIA_VOLUME_SIZE${NC}"

echo ""

# Check logs for errors (last 50 lines)
echo -e "${BLUE}Checking for recent errors...${NC}"

BACKEND_ERRORS=$(docker-compose logs --tail=50 backend 2>&1 | grep -i error | wc -l)
FRONTEND_ERRORS=$(docker-compose logs --tail=50 frontend 2>&1 | grep -i error | wc -l)
DB_ERRORS=$(docker-compose logs --tail=50 db 2>&1 | grep -i error | wc -l)

if [ "$BACKEND_ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Backend has $BACKEND_ERRORS error(s) in recent logs${NC}"
    OVERALL_STATUS=1
fi

if [ "$FRONTEND_ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Frontend has $FRONTEND_ERRORS error(s) in recent logs${NC}"
    OVERALL_STATUS=1
fi

if [ "$DB_ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Database has $DB_ERRORS error(s) in recent logs${NC}"
    OVERALL_STATUS=1
fi

if [ "$BACKEND_ERRORS" -eq 0 ] && [ "$FRONTEND_ERRORS" -eq 0 ] && [ "$DB_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ No errors found in recent logs${NC}"
fi

echo ""

# Network connectivity
echo -e "${BLUE}Checking network connectivity...${NC}"
if docker network inspect vrss_network > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker network 'vrss_network' exists${NC}"

    # Count connected containers
    CONNECTED=$(docker network inspect vrss_network | grep -c "IPv4Address")
    echo -e "  Connected containers: ${YELLOW}$CONNECTED${NC}"
else
    echo -e "${RED}✗ Docker network 'vrss_network' not found${NC}"
    OVERALL_STATUS=1
fi

echo ""

# Summary
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  All Systems Operational ✓                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Access your application:${NC}"
    echo "  Frontend:    http://localhost:5173"
    echo "  Backend API: http://localhost:3000"
    echo "  Database:    localhost:5432"
else
    echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Some Issues Detected                     ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check logs: make logs"
    echo "  2. Restart services: make restart"
    echo "  3. Rebuild if needed: make rebuild"
    echo ""
    exit 1
fi

exit 0
