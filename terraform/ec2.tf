data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.ec2_instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2_profile.arn
  }

  vpc_security_group_ids = [aws_security_group.ec2_instance.id]

  # User data script, rendered from the template file
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    aws_region              = var.aws_region
    project_name            = var.project_name
    jwt_secret              = var.jwt_secret
    dockerhub_username              = var.dockerhub_username
    app_server_port                 = var.app_server_port
    app_client_port_nginx           = var.app_client_port_nginx
    docker_compose_version          = var.docker_compose_version
    users_table_name                = var.users_table_name
    recipes_table_name              = var.recipes_table_name
    recipe_collections_table_name   = var.recipe_collections_table_name
    meal_plans_table_name           = var.meal_plans_table_name
  }))

  # Enable detailed monitoring if desired ( incurs costs if not in free tier limits)
  # monitoring {
  #   enabled = true
  # }

  # It's good practice to enable instance metadata service v2 (IMDSv2)
  metadata_options {
    http_tokens               = "required"
    http_endpoint             = "enabled"
    http_put_response_hop_limit = 2 # Allow for Docker bridge network hop
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-instance"
      Project     = var.project_name
      Environment = "production"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name        = "${var.project_name}-volume"
      Project     = var.project_name
      Environment = "production"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "app" {
  name_prefix               = "${var.project_name}-asg-"
  min_size                  = var.min_size_asg
  max_size                  = var.max_size_asg
  desired_capacity          = var.desired_capacity_asg
  health_check_type         = "ELB" # Use ELB health checks
  health_check_grace_period = 300   # Give instances time to start up

  vpc_zone_identifier = [for subnet in aws_subnet.public : subnet.id]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest" # Always use the latest version of the launch template
  }

  # Attach to the ALB target group (will be defined in alb.tf)
  target_group_arns = [aws_lb_target_group.app.arn] # This creates a dependency on the target group

  # Instance refresh settings for rolling updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50 # Or higher, e.g., 100 for zero downtime if max_size > desired_capacity
      instance_warmup        = 300 # Time for new instances to become healthy
    }
    # triggers = ["launch_template"] # This trigger is often implicit now
  }

  # Tags for the Auto Scaling Group itself and propagated to instances
  # Note: propagate_at_launch = true is default for these tags
  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-instance"
    propagate_at_launch = true
  }
  tag {
    key                 = "Project"
    value               = var.project_name
    propagate_at_launch = true
  }
  tag {
    key                 = "Environment"
    value               = "production"
    propagate_at_launch = true
  }

  # Wait for ELB capacity to be healthy before considering the ASG update successful
  # This is important for terraform apply to wait until instances are healthy in the ALB
  wait_for_elb_capacity = var.desired_capacity_asg > 0 ? var.desired_capacity_asg : null

  lifecycle {
    create_before_destroy = true
  }
}

# CloudWatch Log Groups for Docker container logs
resource "aws_cloudwatch_log_group" "client_logs" {
  name              = "${var.project_name}-client-logs"
  retention_in_days = 7 # Adjust as needed

  tags = {
    Name        = "${var.project_name}-client-logs"
    Project     = var.project_name
    Environment = "production"
  }
}

resource "aws_cloudwatch_log_group" "server_logs" {
  name              = "${var.project_name}-server-logs"
  retention_in_days = 7 # Adjust as needed

  tags = {
    Name        = "${var.project_name}-server-logs"
    Project     = var.project_name
    Environment = "production"
  }
}
