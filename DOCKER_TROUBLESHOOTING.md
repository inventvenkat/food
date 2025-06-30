# Docker Troubleshooting Guide

## 🐳 Common Docker Issues and Solutions

### 🔥 DynamoDB Local Issues

#### **Problem: SQLite Permission Errors**
```
WARNING: [sqlite] cannot open DB[6]: SQLiteException: [14] unable to open database file
```

**Solutions:**

1. **Use In-Memory Mode (Recommended for Development)**
   ```yaml
   dynamodb-local:
     command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"]
   ```

2. **Fix Volume Permissions**
   ```bash
   # Run the permission fix script
   ./scripts/fix-dynamodb-permissions.sh
   
   # Or manually:
   docker-compose down
   docker volume rm dynamodb-local-data
   docker volume create dynamodb-local-data
   ```

3. **Alternative: Use Host Mount**
   ```yaml
   dynamodb-local:
     volumes:
       - ./data/dynamodb:/home/dynamodblocal/data
   ```

#### **Problem: DynamoDB Health Check Failing**
```
dynamodb-local-1 | curl: command not found
```

**Solution:** Install curl in DynamoDB container or use alternative health check:
```yaml
healthcheck:
  test: ["CMD-SHELL", "nc -z localhost 8000 || exit 1"]
```

---

### 🌐 Nginx/Client Issues

#### **Problem: 502 Bad Gateway**
**Cause:** Backend server not ready when Nginx starts

**Solution:** Ensure proper service dependencies:
```yaml
client:
  depends_on:
    server:
      condition: service_healthy
```

#### **Problem: Client Build Fails**
**Cause:** Node modules or build context issues

**Solutions:**
1. **Clear node_modules:**
   ```bash
   rm -rf client/node_modules
   docker-compose build --no-cache client
   ```

2. **Check .dockerignore:**
   Ensure `node_modules` is in `.dockerignore`

---

### 🚀 Server Issues

#### **Problem: Server Won't Start**
**Cause:** Missing environment variables or DynamoDB connection

**Solutions:**
1. **Check environment variables:**
   ```bash
   docker-compose logs server
   ```

2. **Verify DynamoDB connection:**
   ```bash
   curl http://localhost:8000/
   ```

3. **Check server logs:**
   ```bash
   docker-compose exec server node -e "console.log(process.env)"
   ```

#### **Problem: File Upload Permissions**
**Cause:** Volume mount permission issues

**Solution:**
```bash
# Fix upload directory permissions
sudo chown -R $USER:$USER ./server/uploads
chmod 755 ./server/uploads
```

---

### 📦 General Docker Issues

#### **Problem: Port Conflicts**
```
Error: Port 3003 is already in use
```

**Solutions:**
1. **Kill processes using ports:**
   ```bash
   sudo lsof -ti:3003 | xargs kill -9
   ```

2. **Change ports in docker-compose.yml:**
   ```yaml
   ports:
     - "3004:80"  # Use different host port
   ```

#### **Problem: Build Cache Issues**
**Solution:** Clear Docker build cache:
```bash
docker system prune -a
docker-compose build --no-cache
```

#### **Problem: Volume Permission Denied**
**Solutions:**
1. **Fix ownership:**
   ```bash
   sudo chown -R $USER:$USER ./volumes
   ```

2. **Use named volumes instead of bind mounts**

---

## 🛠️ Docker Commands Reference

### **Development Workflow:**
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart server

# Rebuild and start
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### **Debugging Commands:**
```bash
# Execute shell in running container
docker-compose exec server sh

# Check service status
docker-compose ps

# View resource usage
docker stats

# Inspect service configuration
docker-compose config

# Follow specific service logs
docker-compose logs -f server
```

### **Cleanup Commands:**
```bash
# Remove stopped containers
docker container prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Clean everything
docker system prune -a
```

---

## 🔧 Configuration Files

### **Development (docker-compose.yml):**
- In-memory DynamoDB for speed
- Volume mounts for uploads
- Debug-friendly settings

### **Development with Persistence (docker-compose.dev.yml):**
- Persistent DynamoDB data
- Development optimizations
- Source code mounting options

### **Production (docker-compose.prod.yml):**
- AWS DynamoDB integration
- Security optimizations
- Health checks and restart policies

---

## 🚨 Emergency Procedures

### **Complete Reset:**
```bash
# Stop everything
docker-compose down -v

# Remove all containers, networks, volumes
docker system prune -a -f

# Remove all images
docker rmi $(docker images -q) -f

# Rebuild from scratch
docker-compose up --build
```

### **Quick Fix for Common Issues:**
```bash
# Fix most permission issues
sudo chown -R $USER:$USER .

# Fix DynamoDB issues
./scripts/fix-dynamodb-permissions.sh

# Reset to in-memory DynamoDB
# Edit docker-compose.yml and change command to -inMemory
```

---

## 📞 Getting Help

1. **Check logs first:**
   ```bash
   docker-compose logs
   ```

2. **Verify service health:**
   ```bash
   curl http://localhost:3002/healthz  # Server
   curl http://localhost:3003/healthz  # Client
   curl http://localhost:8000/         # DynamoDB
   ```

3. **Check Docker status:**
   ```bash
   docker-compose ps
   docker stats
   ```

4. **Common URLs:**
   - Frontend: http://localhost:3003
   - Backend API: http://localhost:3002
   - DynamoDB Local: http://localhost:8000