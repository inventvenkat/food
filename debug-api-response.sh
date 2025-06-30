#!/bin/bash

echo "🔍 Debugging API Response"
echo "========================"

echo "1️⃣ Testing server on port 3002..."
response=$(curl -s "http://localhost:3002/api/recipes/public?limit=20")
echo "Response: $response"
echo ""

echo "2️⃣ Checking if response contains Indian recipes..."
if echo "$response" | grep -q "Masala\|Dal\|Dosa\|Biryani\|Paneer"; then
    echo "✅ Found Indian recipes in API response"
    echo "Indian recipes found:"
    echo "$response" | grep -o '"name":"[^"]*[Mm]asala[^"]*"'
    echo "$response" | grep -o '"name":"[^"]*[Dd]al[^"]*"'
    echo "$response" | grep -o '"name":"[^"]*[Dd]osa[^"]*"'
else
    echo "❌ No Indian recipes found in API response"
fi

echo ""
echo "3️⃣ Testing server on port 3001 (fallback)..."
response2=$(curl -s "http://localhost:3001/api/recipes/public?limit=20" 2>/dev/null)
if [ -n "$response2" ]; then
    echo "✅ Server also responding on port 3001"
    echo "Response: $response2"
else
    echo "❌ No response from port 3001"
fi

echo ""
echo "4️⃣ Checking what ports are actually running..."
netstat -tulpn 2>/dev/null | grep ":300[1-9]" || echo "No services found on ports 3001-3009"

echo ""
echo "5️⃣ Testing client on port 3003..."
client_response=$(curl -s "http://localhost:3003/api/recipes/public?limit=20" 2>/dev/null)
if [ -n "$client_response" ]; then
    echo "✅ Client proxy working"
    echo "Response: $client_response"
else
    echo "❌ Client proxy not working"
fi