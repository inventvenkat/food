resource "aws_iam_role" "ec2_instance_role" {
  name = "${var.project_name}-ec2-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-ec2-instance-role"
    Project     = var.project_name
    Environment = "production"
  }
}

# Policy for DynamoDB access
resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess" # Consider a more restrictive policy for production
}

# Policy for SSM Session Manager access
resource "aws_iam_role_policy_attachment" "ssm_access" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM Policy for CloudWatch Logs
data "aws_iam_policy_document" "cloudwatch_logs_policy_doc" {
  statement {
    actions = [
      "logs:CreateLogGroup",    # Already created by Terraform, but good to have if needed
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams" # Useful for the agent
    ]
    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${var.project_name}-client-logs:*",
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${var.project_name}-server-logs:*",
      # If you create other log groups, add their ARNs here
    ]
    effect = "Allow"
  }
}

resource "aws_iam_policy" "cloudwatch_logs_policy" {
  name        = "${var.project_name}-cloudwatch-logs-policy"
  description = "Policy to allow EC2 instances to write to specific CloudWatch Log Groups"
  policy      = data.aws_iam_policy_document.cloudwatch_logs_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "cloudwatch_logs_attachment" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = aws_iam_policy.cloudwatch_logs_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2_instance_role.name

  tags = {
    Name        = "${var.project_name}-ec2-profile"
    Project     = var.project_name
    Environment = "production"
  }
}

data "aws_caller_identity" "current" {} # To get the current account ID for policy ARNs
