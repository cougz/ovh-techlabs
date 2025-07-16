import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from core.celery_app import celery_app
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

@celery_app.task
def send_email_notification(to_email: str, subject: str, body: str, html_body: str = None):
    """Send email notification."""
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
        logger.warning("SMTP not configured, skipping email notification")
        return
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add text body
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML body if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {str(e)}")
        raise

@celery_app.task
def send_workshop_credentials(attendee_email: str, attendee_name: str, workshop_name: str, credentials: dict):
    """Send workshop credentials to attendee."""
    subject = f"Workshop Credentials - {workshop_name}"
    
    body = f"""
Dear {attendee_name},

Your workshop environment is ready! Here are your access credentials:

Workshop: {workshop_name}
Username: {credentials.get('username', 'N/A')}
Password: {credentials.get('password', 'N/A')}
OVH Project ID: {credentials.get('ovh_project_id', 'N/A')}

Please keep these credentials secure and do not share them with others.

Best regards,
TechLabs Automation Team
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f4f4f4; padding: 20px; text-align: center; }}
        .credentials {{ background-color: #e8f4f8; padding: 15px; margin: 20px 0; border-radius: 5px; }}
        .warning {{ background-color: #fff3cd; padding: 10px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Workshop Credentials</h2>
        </div>
        
        <p>Dear {attendee_name},</p>
        
        <p>Your workshop environment is ready! Here are your access credentials:</p>
        
        <div class="credentials">
            <h3>Workshop: {workshop_name}</h3>
            <p><strong>Username:</strong> {credentials.get('username', 'N/A')}</p>
            <p><strong>Password:</strong> {credentials.get('password', 'N/A')}</p>
            <p><strong>OVH Project ID:</strong> {credentials.get('ovh_project_id', 'N/A')}</p>
        </div>
        
        <div class="warning">
            <p><strong>Important:</strong> Please keep these credentials secure and do not share them with others.</p>
        </div>
        
        <p>Best regards,<br>TechLabs Automation Team</p>
    </div>
</body>
</html>
"""
    
    send_email_notification.delay(attendee_email, subject, body, html_body)

@celery_app.task
def send_workshop_completion_notification(attendee_email: str, attendee_name: str, workshop_name: str):
    """Send workshop completion notification."""
    subject = f"Workshop Completed - {workshop_name}"
    
    body = f"""
Dear {attendee_name},

The workshop "{workshop_name}" has been completed.

Your workshop environment will be automatically cleaned up in 72 hours to ensure proper resource management.

If you need to access any data or configurations from your workshop environment, please do so within the next 72 hours.

Thank you for participating in our workshop!

Best regards,
TechLabs Automation Team
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f4f4f4; padding: 20px; text-align: center; }}
        .info {{ background-color: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745; }}
        .warning {{ background-color: #fff3cd; padding: 10px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Workshop Completed</h2>
        </div>
        
        <p>Dear {attendee_name},</p>
        
        <div class="info">
            <p>The workshop <strong>"{workshop_name}"</strong> has been completed.</p>
        </div>
        
        <div class="warning">
            <p><strong>Important:</strong> Your workshop environment will be automatically cleaned up in 72 hours to ensure proper resource management.</p>
            <p>If you need to access any data or configurations from your workshop environment, please do so within the next 72 hours.</p>
        </div>
        
        <p>Thank you for participating in our workshop!</p>
        
        <p>Best regards,<br>TechLabs Automation Team</p>
    </div>
</body>
</html>
"""
    
    send_email_notification.delay(attendee_email, subject, body, html_body)