#!/bin/bash

echo ""
echo "========================================"
echo "  MKT Turismo - Create Superadmin User"
echo "========================================"
echo ""
echo "This script will create a superadmin user with full system access."
echo ""
echo "Requirements:"
echo "- Node.js must be installed"
echo "- Firebase dependencies must be installed"
echo ""
echo "Press Enter to continue..."
read

echo ""
echo "Running superadmin creation script..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js and try again"
    exit 1
fi

# Check if the script file exists
if [ ! -f "scripts/create-superadmin.js" ]; then
    echo "❌ Error: create-superadmin.js script not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Run the Node.js script
node scripts/create-superadmin.js

echo ""
echo "Script execution completed."
echo "Press Enter to exit..."
read
