#!/bin/bash
export HOME=/root
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user_data script..."

# Install updates and basic tools
sudo yum update -y
sudo yum install -y docker git

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to the docker group so you can execute Docker commands without sudo
sudo usermod -a -G docker ec2-user
# newgrp docker # This command would require a new shell session to take effect immediately for the script itself.
# For the script, commands needing docker will use sudo or be run by root effectively.

# Install Docker Compose
# DOCKER_COMPOSE_VERSION="v2.20.2" # This line is now controlled by a Terraform variable
sudo curl -L "https://github.com/docker/compose/releases/download/${docker_compose_version}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
# Verify installation
docker-compose --version

echo "Docker and Docker Compose installed."

# Create a directory for the app
APP_DIR="/opt/app"
sudo mkdir -p $APP_DIR
cd $APP_DIR

# Start the application using Docker Compose
docker-compose -f docker-compose.aws.yml up -d

# Create docker-compose.aws.yml
echo "Creating docker-compose.aws.yml..."
sudo cat <<EOF > $APP_DIR/docker-compose.aws.yml
version: '3.8'
services:
  client:
    image: ${dockerhub_username}/goodfood-client:latest
    ports:
      - "3003:80"
    depends_on:
      - server
    command: ["/bin/bash", "-c", "/usr/local/bin/wait-for-it.sh server:${app_server_port} -t 60 -- nginx -g 'daemon off;'"]
    networks:
      - app-network
    restart: always
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "${project_name}-client-logs"
        awslogs-region: "${aws_region}"
  server:
    image: ${dockerhub_username}/goodfood-server:latest
    ports:
      - "3002:3001"
    environment:
      - JWT_SECRET=${jwt_secret}
      - APP_PORT=${app_server_port}
      - AWS_REGION=${aws_region}
      - AWS_DEFAULT_REGION=${aws_region}
      - AWS_STS_REGIONAL_ENDPOINTS=regional
      - USERS_TABLE_NAME=${users_table_name}
      - RECIPES_TABLE_NAME=${recipes_table_name}
      - RECIPE_COLLECTIONS_TABLE_NAME=${recipe_collections_table_name}
      - MEAL_PLANS_TABLE_NAME=${meal_plans_table_name}
    command: [
        "sh",
        "-c",
        "echo '>>>> STARTING SERVER CONTAINER SCRIPT <<<<' &&
         echo 'ENV VARS CHECK:' &&
         echo 'USERS_TABLE_NAME: [\$$USERS_TABLE_NAME]' &&
         echo 'RECIPES_TABLE_NAME: [\$$RECIPES_TABLE_NAME]' &&
         echo 'RECIPE_COLLECTIONS_TABLE_NAME: [\$$RECIPE_COLLECTIONS_TABLE_NAME]' &&
         echo 'MEAL_PLANS_TABLE_NAME: [\$$MEAL_PLANS_TABLE_NAME]' &&
         echo 'AWS_REGION: [\$$AWS_REGION]' &&
         echo 'AWS_DEFAULT_REGION: [\$$AWS_DEFAULT_REGION]' &&
         echo 'AWS_STS_REGIONAL_ENDPOINTS: [\$$AWS_STS_REGIONAL_ENDPOINTS]' &&
         echo 'APP_PORT: [\$$APP_PORT]' &&
         echo 'JWT_SECRET: [\$$JWT_SECRET]' &&
         echo '---------------------------------' &&
         echo 'Starting Node app (node index.js)...' &&
         node index.js"
    ]
    networks:
      - app-network
    restart: always
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "${project_name}-server-logs"
        awslogs-region: "${aws_region}"
networks:
  app-network:
    driver: bridge
EOF

echo "docker-compose.aws.yml created."
cat $APP_DIR/docker-compose.aws.yml # Log the content of the compose file

# Pull images from Docker Hub
echo "Pulling Docker images..."
sudo /usr/local/bin/docker-compose -f $APP_DIR/docker-compose.aws.yml pull

# Start the application
echo "Starting application using Docker Compose..."
sudo /usr/local/bin/docker-compose -f $APP_DIR/docker-compose.aws.yml up -d

echo "User_data script finished."
