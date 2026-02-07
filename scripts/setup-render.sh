#!/bin/bash
# Render Deployment Setup Script
# This script helps configure Render environment variables via CLI

set -e

echo "🚀 Render Deployment Setup"
echo "=========================="
echo ""

# Check if render CLI is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI not found. Installing..."
    npm install -g @render-oss/cli
    echo "✅ Render CLI installed"
fi

echo "📋 Please have the following ready:"
echo "   - Render API Key (from https://dashboard.render.com/account/api-keys)"
echo "   - Your service name/ID"
echo ""

read -p "Enter your Render API Key: " RENDER_API_KEY
read -p "Enter your Render Service ID: " SERVICE_ID

echo ""
echo "🔐 Setting environment variables..."

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local description=$3

    echo "Setting $key..."
    curl -X PUT "https://api.render.com/v1/services/$SERVICE_ID/env-vars/$key" \
         -H "Authorization: Bearer $RENDER_API_KEY" \
         -H "Content-Type: application/json" \
         -d "{\"value\": \"$value\"}" \
         2>/dev/null || echo "  (may already exist, updating...)"
}

# Google OAuth
echo ""
read -p "Enter GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -p "Enter GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
set_env_var "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID" "Google OAuth Client ID"
set_env_var "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET" "Google OAuth Secret"

# Session Secret
echo ""
echo "Generating SESSION_SECRET..."
SESSION_SECRET=$(openssl rand -base64 32)
set_env_var "SESSION_SECRET" "$SESSION_SECRET" "Session encryption secret"
echo "✅ Generated: $SESSION_SECRET"

# Gemini API
echo ""
read -p "Enter GEMINI_API_KEY: " GEMINI_API_KEY
set_env_var "GEMINI_API_KEY" "$GEMINI_API_KEY" "Google Gemini API Key"

# Admin emails
echo ""
read -p "Enter admin email(s) (comma-separated): " ADMIN_EMAILS
set_env_var "ADMIN_EMAILS" "$ADMIN_EMAILS" "Admin email addresses"

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "🚀 Triggering deployment..."
curl -X POST "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     -H "Content-Type: application/json"

echo ""
echo "✅ Deployment triggered!"
echo "📊 View logs at: https://dashboard.render.com/web/$SERVICE_ID"
echo ""
echo "⏳ Deployment usually takes 3-5 minutes"
