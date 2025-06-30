resource "aws_lb" "app" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [for subnet in aws_subnet.public : subnet.id]

  enable_deletion_protection = false # Set to true for production if desired

  tags = {
    Name        = "${var.project_name}-alb"
    Project     = var.project_name
    Environment = "production"
  }
}

resource "aws_lb_target_group" "app" {
  name_prefix = "gf-tg-"
  port        = 3003 # Port where client nginx is exposed on EC2 instances
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance" # Instances in the ASG

  health_check {
    enabled             = true
    path                = "/healthz" # Health check endpoint provided by nginx
    protocol            = "HTTP"
    port                = "3003" # Health check on port 3003 where client is exposed
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30 # Check every 30 seconds
  }

  lifecycle {
    create_before_destroy = true
    # Ignore changes to tags to prevent conflicts with ASG
    ignore_changes = [tags]
  }

  tags = {
    Name        = "${var.project_name}-tg"
    Project     = var.project_name
    Environment = "production"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect" # Redirect HTTP to HTTPS
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301" # Permanent redirect
    }
  }

  tags = {
    Name        = "${var.project_name}-http-listener"
    Project     = var.project_name
    Environment = "production"
  }
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08" # A common default, can be adjusted if needed
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn # Forwards to your application
  }

  tags = {
    Name        = "${var.project_name}-https-listener"
    Project     = var.project_name
    Environment = "production"
  }
}
