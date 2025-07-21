#!/bin/bash

# Docker Compose Reset Script
# This script stops containers, removes all volumes, and rebuilds the stack

set -e  # Exit on any error

echo "🔄 Starting Docker Compose reset process..."

# Step 0: Pull latest changes from git in current directory
echo "📥 Pulling latest changes from git..."
git pull

# Step 1: Navigate to docker directory (detect automatically)
DOCKER_DIR=""
if [ -d "docker" ]; then
    DOCKER_DIR="docker"
elif [ -d "platform" ]; then
    DOCKER_DIR="platform"
else
    echo "❌ Error: Could not find docker or platform directory"
    exit 1
fi

echo "📁 Navigating to $DOCKER_DIR directory..."
cd "$DOCKER_DIR"

# Step 1: Bring down the Docker Compose stack
echo "📉 Bringing down Docker Compose stack..."
sudo docker compose down

# Step 2: Remove specific Docker volumes
echo "🗑️  Removing specific Docker volumes..."
VOLUMES_TO_REMOVE=(
    "docker_postgres_data"
    "docker_redis_data"
    "docker_terraform_workspaces"
    "platform_postgres_data"
    "platform_redis_data"
    "platform_terraform_workspaces"
)

for volume in "${VOLUMES_TO_REMOVE[@]}"; do
    if sudo docker volume ls -q | grep -q "^${volume}$"; then
        echo "Removing volume: $volume"
        sudo docker volume rm "$volume"
    else
        echo "Volume not found (skipping): $volume"
    fi
done

echo "✅ Specified volumes removal completed"

# Step 3: Bring up the stack with build
echo "🚀 Starting Docker Compose stack with fresh build..."
sudo docker compose up -d --build

echo "✅ Docker Compose reset completed successfully!"
echo "📊 Current running containers:"
sudo docker compose ps
