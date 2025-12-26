package service

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// SMTPConfig holds SMTP configuration
type SMTPConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

// EmailService handles sending emails via SMTP
type EmailService struct {
	config       SMTPConfig
	appPublicURL string
}

// NewEmailService creates a new EmailService
func NewEmailService(host, port, user, password, from, appPublicURL string) *EmailService {
	return &EmailService{
		config: SMTPConfig{
			Host:     host,
			Port:     port,
			User:     user,
			Password: password,
			From:     from,
		},
		appPublicURL: appPublicURL,
	}
}

// sendEmail sends an email using the configured SMTP server.
func (s *EmailService) sendEmail(ctx context.Context, to, subject, htmlBody string) error {
	if s.config.Host == "" || s.config.Port == "" {
		return fmt.Errorf("SMTP not configured")
	}

	// Set up authentication
	auth := smtp.PlainAuth("", s.config.User, s.config.Password, s.config.Host)

	// TLS config
	tlsconfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         s.config.Host,
	}

	// Connect to the SMTP server
	conn, err := tls.Dial("tcp", fmt.Sprintf("%s:%s", s.config.Host, s.config.Port), tlsconfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}

	c, err := smtp.NewClient(conn, s.config.Host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer c.Close()

	if err = c.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth failed: %w", err)
	}

	// Extract email address from "Name <email>" format if present
	fromEmail := s.config.From
	if idx := strings.Index(fromEmail, "<"); idx != -1 {
		fromEmail = strings.TrimSuffix(fromEmail[idx+1:], ">")
	}

	if err = c.Mail(fromEmail); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}

	if err = c.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO failed: %w", err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("DATA failed: %w", err)
	}

	// Build the email message with headers
	msg := fmt.Sprintf("From: %s\r\n", s.config.From)
	msg += fmt.Sprintf("To: %s\r\n", to)
	msg += fmt.Sprintf("Subject: %s\r\n", subject)
	msg += "MIME-Version: 1.0\r\n"
	msg += "Content-Type: text/html; charset=\"UTF-8\"\r\n"
	msg += "\r\n"
	msg += htmlBody

	_, err = w.Write([]byte(msg))
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("failed to close writer: %w", err)
	}

	return c.Quit()
}

// SendVerificationEmail sends a verification email with a magic link
func (s *EmailService) SendVerificationEmail(ctx context.Context, toEmail, token string) error {
	verifyURL := fmt.Sprintf("%s/auth/verify-email?token=%s", s.appPublicURL, token)

	subject := "Verify your email - Revalyze"

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%);">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="max-width: 520px; margin: 0 auto;">
          
          <!-- Logo -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%%, rgba(6, 182, 212, 0.1) 100%%); padding: 16px 24px; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.2);">
                <span style="font-size: 28px; font-weight: 700; color: #10b981;">✦ Revalyze</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="background: linear-gradient(145deg, #1e293b 0%%, #0f172a 100%%); border-radius: 20px; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td style="padding: 48px 40px;">
                    
                    <!-- Icon -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%%, rgba(6, 182, 212, 0.15) 100%%); border-radius: 50%%; line-height: 72px; font-size: 32px; border: 2px solid rgba(16, 185, 129, 0.3);">
                        ✉️
                      </div>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #f1f5f9; text-align: center; letter-spacing: -0.5px;">
                      Verify Your Email
                    </h1>
                    
                    <!-- Description -->
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #94a3b8; text-align: center;">
                      Thanks for signing up! Click the button below to verify your email address and start optimizing your pricing strategy.
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="%s" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.5);">
                        Verify Email Address
                      </a>
                    </div>
                    
                    <!-- Expiry Note -->
                    <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 14px; color: #fbbf24; text-align: center;">
                        ⏱️ This link expires in <strong>30 minutes</strong>
                      </p>
                    </div>
                    
                    <!-- Alternative Link -->
                    <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center; word-break: break-all;">
                      If the button doesn't work, copy and paste this link:<br>
                      <a href="%s" style="color: #10b981; text-decoration: none;">%s</a>
                    </p>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                Didn't sign up for Revalyze? You can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                © 2025 Revalyze. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, verifyURL, verifyURL, verifyURL)

	log.Printf("[email] Sending verification email to %s", toEmail)
	return s.sendEmail(ctx, toEmail, subject, htmlBody)
}

// SendWelcomeEmail sends a welcome email after verification
func (s *EmailService) SendWelcomeEmail(ctx context.Context, toEmail string) error {
	dashboardURL := fmt.Sprintf("%s/app/overview", s.appPublicURL)

	subject := "Welcome to Revalyze! 🎉"

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%);">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="max-width: 520px; margin: 0 auto;">
          
          <!-- Logo -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%%, rgba(6, 182, 212, 0.1) 100%%); padding: 16px 24px; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.2);">
                <span style="font-size: 28px; font-weight: 700; color: #10b981;">✦ Revalyze</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="background: linear-gradient(145deg, #1e293b 0%%, #0f172a 100%%); border-radius: 20px; border: 1px solid rgba(148, 163, 184, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td style="padding: 48px 40px;">
                    
                    <!-- Celebration Icon -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%%, rgba(6, 182, 212, 0.15) 100%%); border-radius: 50%%; line-height: 72px; font-size: 32px; border: 2px solid rgba(16, 185, 129, 0.3);">
                        🎉
                      </div>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #f1f5f9; text-align: center; letter-spacing: -0.5px;">
                      Welcome to Revalyze!
                    </h1>
                    
                    <!-- Subtitle -->
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #94a3b8; text-align: center;">
                      Your email is verified and your account is ready. Let's start optimizing your pricing strategy!
                    </p>
                    
                    <!-- Features List -->
                    <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
                      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #f1f5f9;">
                        Here's what you can do:
                      </p>
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%">
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>
                            <span style="color: #cbd5e1; font-size: 14px;">
                              <strong style="color: #f1f5f9;">Analyze competitors</strong> — Discover and track your market rivals
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>
                            <span style="color: #cbd5e1; font-size: 14px;">
                              <strong style="color: #f1f5f9;">AI-powered insights</strong> — Get smart recommendations for your pricing
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>
                            <span style="color: #cbd5e1; font-size: 14px;">
                              <strong style="color: #f1f5f9;">Optimize conversions</strong> — Make data-driven pricing decisions
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center;">
                      <a href="%s" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.5);">
                        Go to Dashboard →
                      </a>
                    </div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
                Need help? Reply to this email and we'll get back to you.
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                © 2025 Revalyze. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, dashboardURL)

	log.Printf("[email] Sending welcome email to %s", toEmail)
	return s.sendEmail(ctx, toEmail, subject, htmlBody)
}
