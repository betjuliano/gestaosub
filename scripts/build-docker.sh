#!/bin/bash

# Build script for GestãoSub Docker image
# This script builds an optimized production Docker image

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building GestãoSub Docker image...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Build the image
echo -e "${YELLOW}Building production image...${NC}"
docker build \
    --tag gestaosub:latest \
    --tag gestaosub:$(date +%Y%m%d-%H%M%S) \
    --build-arg NODE_ENV=production \
    .

echo -e "${GREEN}Build completed successfully!${NC}"

# Show image size
echo -e "${YELLOW}Image size:${NC}"
docker images gestaosub:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Optional: Run a quick test
read -p "Do you want to run a quick test of the image? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Running quick test...${NC}"
    docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://test:test@localhost:5432/test" gestaosub:latest &
    CONTAINER_PID=$!
    
    # Wait a bit for the container to start
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}Health check passed!${NC}"
    else
        echo -e "${RED}Health check failed!${NC}"
    fi
    
    # Stop the test container
    kill $CONTAINER_PID 2>/dev/null || true
fi

echo -e "${GREEN}Docker build process completed!${NC}"