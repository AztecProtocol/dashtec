#!/bin/bash
set -e

echo "======================================"
echo "Docker Registry Login Helper"
echo "======================================"

# Configuration
REGISTRY=${REGISTRY:-"your-registry.example.com"}

echo "Registry: $REGISTRY"
echo ""

# Detect registry type and provide specific instructions
if [[ $REGISTRY == *"docker.io"* ]] || [[ $REGISTRY == *"hub.docker.com"* ]]; then
    echo "Detected: Docker Hub"
    echo ""
    echo "Login with your Docker Hub credentials:"
    docker login

elif [[ $REGISTRY == *"ghcr.io"* ]]; then
    echo "Detected: GitHub Container Registry"
    echo ""
    echo "You need a Personal Access Token (PAT) with 'write:packages' scope"
    echo "Create one at: https://github.com/settings/tokens"
    echo ""
    read -p "GitHub Username: " GITHUB_USER
    read -sp "GitHub Personal Access Token: " GITHUB_TOKEN
    echo ""
    echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

elif [[ $REGISTRY == *"ecr"* ]] || [[ $REGISTRY == *"amazonaws.com"* ]]; then
    echo "Detected: AWS ECR"
    echo ""
    echo "Make sure AWS CLI is configured (aws configure)"
    echo ""
    read -p "AWS Region (e.g., us-east-1): " AWS_REGION
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $REGISTRY

elif [[ $REGISTRY == *"gcr.io"* ]] || [[ $REGISTRY == *"pkg.dev"* ]]; then
    echo "Detected: Google Container Registry / Artifact Registry"
    echo ""
    echo "Make sure gcloud is configured (gcloud auth login)"
    echo ""
    gcloud auth configure-docker

elif [[ $REGISTRY == *"azurecr.io"* ]]; then
    echo "Detected: Azure Container Registry"
    echo ""
    echo "Login with Azure CLI:"
    az acr login --name ${REGISTRY%%.*}

else
    echo "Detected: Generic/Private Registry"
    echo ""
    echo "Login with username and password:"
    docker login $REGISTRY
fi

# Verify login
echo ""
echo "🔐 Verifying authentication..."
if docker info 2>/dev/null | grep -q "Username\|Registry"; then
    echo "✅ Successfully logged in to $REGISTRY"
else
    echo "⚠️  Login status unclear, but no errors detected"
fi

echo ""
echo "You can now run:"
echo "  ./scripts/build-for-registry.sh <version>"
echo "  ./scripts/push-to-registry.sh <version>"
