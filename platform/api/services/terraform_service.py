import os
import json
import subprocess
import tempfile
import shutil
from typing import Dict, Optional, List, Tuple
from pathlib import Path
import uuid

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

class TerraformService:
    """Service for managing Terraform operations."""
    
    def __init__(self):
        self.terraform_binary = settings.TERRAFORM_BINARY_PATH
        self.workspace_dir = Path(settings.TERRAFORM_WORKSPACE_DIR)
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        
        # Debug logging
        logger.info(f"TerraformService initialized")
        logger.info(f"Terraform binary path: {self.terraform_binary}")
        logger.info(f"Workspace directory: {self.workspace_dir}")
        
        # Check if terraform binary exists
        if not os.path.exists(self.terraform_binary):
            logger.error(f"Terraform binary not found at: {self.terraform_binary}")
        else:
            logger.info(f"Terraform binary found and accessible")
            
        # Check workspace directory permissions
        if not os.access(self.workspace_dir, os.W_OK):
            logger.error(f"Workspace directory not writable: {self.workspace_dir}")
        else:
            logger.info(f"Workspace directory is writable")
    
    def _get_workspace_path(self, workspace_name: str) -> Path:
        """Get the path for a specific workspace."""
        return self.workspace_dir / workspace_name
    
    def _run_terraform_command(
        self, 
        command: List[str], 
        workspace_path: Path,
        capture_output: bool = True,
        env: Optional[Dict[str, str]] = None
    ) -> Tuple[int, str, str]:
        """Run a terraform command and return the result."""
        cmd = [self.terraform_binary] + command
        
        # DEBUG: Log what credentials are available from settings
        logger.info(f"OVH_ENDPOINT from settings: {settings.OVH_ENDPOINT}")
        logger.info(f"OVH_APPLICATION_KEY exists: {bool(settings.OVH_APPLICATION_KEY)}")
        logger.info(f"OVH_APPLICATION_SECRET exists: {bool(settings.OVH_APPLICATION_SECRET)}")
        logger.info(f"OVH_CONSUMER_KEY exists: {bool(settings.OVH_CONSUMER_KEY)}")
        
        # Set up environment
        terraform_env = os.environ.copy()
        
        # Ensure OVH environment variables are passed to Terraform
        ovh_env_vars = {
            'OVH_ENDPOINT': settings.OVH_ENDPOINT,
            'OVH_APPLICATION_KEY': settings.OVH_APPLICATION_KEY,
            'OVH_APPLICATION_SECRET': settings.OVH_APPLICATION_SECRET,
            'OVH_CONSUMER_KEY': settings.OVH_CONSUMER_KEY
        }
        terraform_env.update(ovh_env_vars)
        
        if env:
            terraform_env.update(env)
        
        # DEBUG: Verify they're in the environment
        logger.info(f"Environment has OVH_APPLICATION_KEY: {'OVH_APPLICATION_KEY' in terraform_env}")
        logger.info(f"Environment has OVH_APPLICATION_SECRET: {'OVH_APPLICATION_SECRET' in terraform_env}")
        logger.info(f"Environment has OVH_CONSUMER_KEY: {'OVH_CONSUMER_KEY' in terraform_env}")
        
        # Log command details
        logger.info(f"Running terraform command: {' '.join(cmd)}")
        logger.info(f"Working directory: {workspace_path}")
        logger.info(f"Workspace exists: {workspace_path.exists()}")
        logger.info(f"Workspace is directory: {workspace_path.is_dir()}")
        
        # Log environment variables (sanitized)
        env_vars = {k: (v[:8] + '...' if 'SECRET' in k or 'KEY' in k else v) 
                   for k, v in terraform_env.items() 
                   if any(key in k for key in ['TF_', 'OVH_'])}
        logger.info(f"Terraform environment variables: {env_vars}")
        
        # Check if we can execute terraform binary
        if not os.access(self.terraform_binary, os.X_OK):
            logger.error(f"Terraform binary is not executable: {self.terraform_binary}")
            return 1, "", "Terraform binary is not executable"
        
        try:
            result = subprocess.run(
                cmd,
                cwd=workspace_path,
                capture_output=capture_output,
                text=True,
                env=terraform_env,
                timeout=1800  # 30 minutes timeout
            )
            
            # Log detailed results
            logger.info(f"Terraform command completed with return code: {result.returncode}")
            
            if result.stdout:
                logger.info(f"Terraform stdout:\n{result.stdout}")
            
            if result.stderr:
                if result.returncode != 0:
                    logger.error(f"Terraform stderr:\n{result.stderr}")
                else:
                    logger.info(f"Terraform stderr (warnings):\n{result.stderr}")
            
            return result.returncode, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            logger.error(f"Terraform command timed out after 30 minutes")
            return 1, "", "Command timed out after 30 minutes"
        except FileNotFoundError:
            logger.error(f"Terraform binary not found: {self.terraform_binary}")
            return 1, "", f"Terraform binary not found: {self.terraform_binary}"
        except Exception as e:
            logger.error(f"Error running terraform command: {str(e)}")
            return 1, "", str(e)
    
    def create_workspace(self, workspace_name: str, terraform_config: Dict) -> bool:
        """Create a new Terraform workspace with the given configuration."""
        workspace_path = self._get_workspace_path(workspace_name)
        
        logger.info(f"Creating workspace: {workspace_name}")
        logger.info(f"Workspace path: {workspace_path}")
        logger.info(f"Config: {terraform_config}")
        
        try:
            # Create workspace directory
            workspace_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created workspace directory: {workspace_path}")
            
            # Write main.tf
            main_tf_content = self._generate_main_tf(terraform_config)
            main_tf_path = workspace_path / "main.tf"
            with open(main_tf_path, "w") as f:
                f.write(main_tf_content)
            logger.info(f"Written main.tf to: {main_tf_path}")
            logger.info(f"main.tf size: {main_tf_path.stat().st_size} bytes")
            
            # Write terraform.tfvars  
            tfvars_content = self._generate_tfvars(terraform_config)
            tfvars_path = workspace_path / "terraform.tfvars"
            with open(tfvars_path, "w") as f:
                f.write(tfvars_content)
            logger.info(f"Written terraform.tfvars to: {tfvars_path}")
            logger.info(f"terraform.tfvars size: {tfvars_path.stat().st_size} bytes")
            
            # Log the OVH credentials (sanitized)
            logger.info(f"OVH_ENDPOINT: {settings.OVH_ENDPOINT}")
            logger.info(f"OVH_APPLICATION_KEY: {settings.OVH_APPLICATION_KEY[:8]}...")
            logger.info(f"OVH_CONSUMER_KEY: {settings.OVH_CONSUMER_KEY[:8]}...")
            
            # Initialize terraform
            logger.info(f"Initializing terraform workspace: {workspace_name}")
            return_code, stdout, stderr = self._run_terraform_command(
                ["init"], workspace_path
            )
            
            if return_code != 0:
                logger.error(f"Failed to initialize terraform workspace: {workspace_name}")
                logger.error(f"Init stderr: {stderr}")
                logger.error(f"Init stdout: {stdout}")
                return False
            
            logger.info(f"Created terraform workspace", workspace=workspace_name)
            return True
            
        except Exception as e:
            logger.error(f"Error creating terraform workspace", workspace=workspace_name, error=str(e))
            return False
    
    def plan(self, workspace_name: str) -> Tuple[bool, str]:
        """Run terraform plan."""
        workspace_path = self._get_workspace_path(workspace_name)
        
        if not workspace_path.exists():
            return False, "Workspace does not exist"
        
        return_code, stdout, stderr = self._run_terraform_command(
            ["plan", "-out=tfplan", "-parallelism=1"], workspace_path
        )
        
        output = stdout + stderr
        success = return_code == 0
        
        if not success:
            logger.error(f"Terraform plan failed", workspace=workspace_name, output=output)
        
        return success, output
    
    def apply(self, workspace_name: str) -> Tuple[bool, str]:
        """Run terraform apply."""
        workspace_path = self._get_workspace_path(workspace_name)
        
        if not workspace_path.exists():
            return False, "Workspace does not exist"
        
        return_code, stdout, stderr = self._run_terraform_command(
            ["apply", "-auto-approve", "-parallelism=1", "tfplan"], workspace_path
        )
        
        output = stdout + stderr
        success = return_code == 0
        
        if success:
            logger.info(f"Terraform apply completed successfully", workspace=workspace_name)
        else:
            logger.error(f"Terraform apply failed", workspace=workspace_name, output=output)
        
        return success, output
    
    def destroy(self, workspace_name: str) -> Tuple[bool, str]:
        """Run terraform destroy."""
        workspace_path = self._get_workspace_path(workspace_name)
        
        if not workspace_path.exists():
            return False, "Workspace does not exist"
        
        return_code, stdout, stderr = self._run_terraform_command(
            ["destroy", "-auto-approve", "-parallelism=1"], workspace_path
        )
        
        output = stdout + stderr
        success = return_code == 0
        
        if success:
            logger.info(f"Terraform destroy completed successfully", workspace=workspace_name)
        else:
            logger.error(f"Terraform destroy failed", workspace=workspace_name, output=output)
        
        return success, output
    
    def get_outputs(self, workspace_name: str) -> Dict:
        """Get terraform outputs."""
        workspace_path = self._get_workspace_path(workspace_name)
        
        if not workspace_path.exists():
            return {}
        
        return_code, stdout, stderr = self._run_terraform_command(
            ["output", "-json"], workspace_path
        )
        
        if return_code != 0:
            logger.error(f"Failed to get terraform outputs", workspace=workspace_name, stderr=stderr)
            return {}
        
        try:
            return json.loads(stdout)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in terraform outputs", workspace=workspace_name, stdout=stdout)
            return {}
    
    def cleanup_workspace(self, workspace_name: str) -> bool:
        """Clean up a terraform workspace."""
        workspace_path = self._get_workspace_path(workspace_name)
        
        if not workspace_path.exists():
            return True
        
        try:
            shutil.rmtree(workspace_path)
            logger.info(f"Cleaned up terraform workspace", workspace=workspace_name)
            return True
        except Exception as e:
            logger.error(f"Error cleaning up terraform workspace", workspace=workspace_name, error=str(e))
            return False
    
    def _generate_main_tf(self, config: Dict) -> str:
        """Generate main.tf content from configuration."""
        template = '''
terraform {
  required_providers {
    ovh = {
      source = "ovh/ovh"
    }
  }
}

# Provider configuration - reads from environment variables automatically
provider "ovh" {
  endpoint = "ovh-eu"
  # application_key, application_secret, and consumer_key will be read from:
  # OVH_APPLICATION_KEY, OVH_APPLICATION_SECRET, OVH_CONSUMER_KEY environment variables
}

# Variables for this deployment
variable "project_description" {
  type = string
}

variable "username" {
  type = string
}

variable "user_email" {
  type = string
}

# Local values for sanitized resource names
locals {
  # Sanitize username for OVH resource names (alphanumeric, -, /, _, + only)
  # Replace dots, spaces, @ symbols, and any other invalid characters with dashes
  sanitized_username = lower(replace(replace(replace(var.username, ".", "-"), " ", "-"), "@", "-at-"))
}

# Get account info for subsidiary
data "ovh_me" "myaccount" {}

# Create cart for ordering
data "ovh_order_cart" "mycart" {
  ovh_subsidiary = data.ovh_me.myaccount.ovh_subsidiary
}

# Get cloud project plan
data "ovh_order_cart_product_plan" "cloud" {
  cart_id        = data.ovh_order_cart.mycart.id
  price_capacity = "renew"
  product        = "cloud"
  plan_code      = "project.2018"
}

# Create OVH Public Cloud Project
resource "ovh_cloud_project" "workshop_project" {
  ovh_subsidiary = data.ovh_order_cart.mycart.ovh_subsidiary
  description    = var.project_description

  plan {
    duration     = data.ovh_order_cart_product_plan.cloud.selected_price.0.duration
    plan_code    = data.ovh_order_cart_product_plan.cloud.plan_code
    pricing_mode = data.ovh_order_cart_product_plan.cloud.selected_price.0.pricing_mode
  }
}

# Create IAM user
resource "ovh_me_identity_user" "workshop_user" {
  description = var.username
  email       = var.user_email
  group       = "UNPRIVILEGED"
  login       = var.username
  password    = "TempPassword123!" # Will be changed later
}

# Create IAM policy
resource "ovh_iam_policy" "workshop_policy" {
  name        = "access-grant-for-pci-project-${local.sanitized_username}"
  description = "Grants access to ${var.username} for PCI project ${ovh_cloud_project.workshop_project.project_id}"
  identities  = [ovh_me_identity_user.workshop_user.urn]
  resources   = [ovh_cloud_project.workshop_project.urn]
  allow       = ["*"]
}

# Outputs
output "project_id" {
  value = ovh_cloud_project.workshop_project.project_id
}

output "project_urn" {
  value = ovh_cloud_project.workshop_project.urn
}

output "user_urn" {
  value = ovh_me_identity_user.workshop_user.urn
}

output "username" {
  value = ovh_me_identity_user.workshop_user.login
}

output "password" {
  value = ovh_me_identity_user.workshop_user.password
  sensitive = true
}
'''
        return template.strip()
    
    def _generate_tfvars(self, config: Dict) -> str:
        """Generate terraform.tfvars content from configuration."""
        # Only include non-OVH variables since OVH credentials come from environment
        tfvars = f'''
project_description = "{config.get('project_description', 'TechLabs environment')}"
username            = "{config.get('username', 'workshop-user')}"
user_email         = "{config.get('email', 'workshop@example.com')}"
'''
        return tfvars.strip()

# Global instance
terraform_service = TerraformService()