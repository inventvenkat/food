output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer."
  value       = aws_lb.app.dns_name
}

output "users_table_arn" {
  description = "ARN of the Users DynamoDB table."
  value       = aws_dynamodb_table.users_table.arn
}

output "recipes_table_arn" {
  description = "ARN of the Recipes DynamoDB table."
  value       = aws_dynamodb_table.recipes_table.arn
}

output "recipe_collections_table_arn" {
  description = "ARN of the Recipe Collections DynamoDB table."
  value       = aws_dynamodb_table.recipe_collections_table.arn
}

output "meal_plans_table_arn" {
  description = "ARN of the Meal Plans DynamoDB table."
  value       = aws_dynamodb_table.meal_plans_table.arn
}

output "ec2_asg_name" {
  description = "Name of the EC2 Auto Scaling Group."
  value       = aws_autoscaling_group.app.name
}

output "instructions" {
  description = "Next steps and important information."
  sensitive   = true # Mark as sensitive because it contains the JWT_SECRET placeholder
  value = <<EOT
----------------------------------------------------------------------------------------------------
Your AWS infrastructure for the '${var.project_name}' application should be provisioning.

Next Steps:

1. IMPORTANT - Docker Images:
   Before running 'terraform apply', you MUST build and push your Docker images to Docker Hub.
   Your Docker Hub username is set to: ${var.dockerhub_username}

   Run these commands from the root of your project:
   --------------------------------------------------
   docker login
   docker build -t ${var.dockerhub_username}/food-client:latest ./client
   docker push ${var.dockerhub_username}/food-client:latest
   docker build -t ${var.dockerhub_username}/food-server:latest ./server
   docker push ${var.dockerhub_username}/food-server:latest
   --------------------------------------------------

2. Initialize Terraform (if you haven't already):
   cd terraform
   terraform init

3. Review the plan:
   terraform plan

4. Apply the configuration:
   terraform apply

   Terraform will ask for confirmation before creating resources.

5. Access your application:
   Once 'terraform apply' is complete, the 'alb_dns_name' output will give you the URL
   to access your application. It might take a few minutes for the EC2 instances to
   fully initialize, pull images, and start the services.

6. JWT Secret:
   The current JWT_SECRET is a placeholder: '${var.jwt_secret}'
   For a production environment, you MUST change this to a strong, unique secret.
   You can override it by creating a 'terraform.tfvars' file in the 'terraform' directory
   with the content:
   jwt_secret = "your-new-strong-secret-here"
   Or, pass it at apply time: terraform apply -var="jwt_secret=your-new-strong-secret-here"
   Consider using AWS Secrets Manager for production.

7. SSH Access to EC2 Instances:
   The EC2 security group allows SSH from 0.0.0.0/0.
   FOR PRODUCTION, YOU MUST RESTRICT THIS to your specific IP address.
   Edit 'terraform/security_groups.tf' and change the cidr_blocks for SSH.
   Alternatively, use AWS Systems Manager Session Manager (IAM policy is already attached).
   To connect via Session Manager (after installing AWS CLI and Session Manager plugin):
   aws ssm start-session --target INSTANCE_ID --region ${var.aws_region}
   (Replace INSTANCE_ID with an ID from your ASG)

8. DNS Setup:
   The ALB is configured with HTTPS support using your ACM certificate for *.cookfood.xyz.
   To complete the setup:
   a. In GoDaddy DNS, create an A record for 'cookfood.xyz' pointing to the ALB's IP addresses.
   b. Get the ALB IP addresses by resolving the ALB DNS name (nslookup or dig command).
   c. The certificate validation CNAME should already be added to GoDaddy for ACM.
   d. The ALB will automatically redirect HTTP to HTTPS and serve your application securely.

9. Monitoring & Logs:
   - EC2 instance user_data logs: /var/log/user-data.log on the instance.
   - Docker container logs are configured to go to CloudWatch Log Groups:
     - ${var.project_name}-client-logs
     - ${var.project_name}-server-logs
   Check these in the AWS CloudWatch console in the ${var.aws_region} region.

10. Destroying the infrastructure:
    When you no longer need these resources, run:
    terraform destroy
----------------------------------------------------------------------------------------------------
EOT
}
