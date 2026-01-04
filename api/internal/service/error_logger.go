package service

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// ErrorLogger handles application error logging.
type ErrorLogger struct {
	repo *mongorepo.ErrorLogRepository
}

// Global error logger instance
var globalErrorLogger *ErrorLogger

// InitErrorLogger initializes the global error logger.
func InitErrorLogger(repo *mongorepo.ErrorLogRepository) {
	globalErrorLogger = &ErrorLogger{repo: repo}
}

// GetErrorLogger returns the global error logger.
func GetErrorLogger() *ErrorLogger {
	return globalErrorLogger
}

// LogError logs an error to the database.
func (l *ErrorLogger) LogError(ctx context.Context, category, message string, details string, userID primitive.ObjectID, userEmail string) {
	if l == nil || l.repo == nil {
		log.Printf("[error-logger] ERROR: %s - %s (logger not initialized)", category, message)
		return
	}

	errLog := &model.ErrorLog{
		Timestamp: time.Now(),
		Level:     "error",
		Category:  category,
		Message:   message,
		Details:   details,
		UserID:    userID,
		UserEmail: userEmail,
	}

	if err := l.repo.Create(ctx, errLog); err != nil {
		log.Printf("[error-logger] Failed to persist error log: %v", err)
	}

	// Also log to console
	log.Printf("[%s] ERROR: %s - %s", category, message, details)
}

// LogWarning logs a warning to the database.
func (l *ErrorLogger) LogWarning(ctx context.Context, category, message string, details string) {
	if l == nil || l.repo == nil {
		log.Printf("[error-logger] WARNING: %s - %s", category, message)
		return
	}

	errLog := &model.ErrorLog{
		Timestamp: time.Now(),
		Level:     "warning",
		Category:  category,
		Message:   message,
		Details:   details,
	}

	if err := l.repo.Create(ctx, errLog); err != nil {
		log.Printf("[error-logger] Failed to persist warning log: %v", err)
	}

	log.Printf("[%s] WARNING: %s", category, message)
}

// Quick helper functions for common error types

// LogEmailError logs an email-related error.
func LogEmailError(ctx context.Context, message string, err error, userEmail string) {
	if globalErrorLogger == nil {
		log.Printf("[email] ERROR: %s - %v", message, err)
		return
	}
	details := ""
	if err != nil {
		details = err.Error()
	}
	globalErrorLogger.LogError(ctx, "email", message, details, primitive.NilObjectID, userEmail)
}

// LogAuthError logs an authentication error.
func LogAuthError(ctx context.Context, message string, err error, userEmail string) {
	if globalErrorLogger == nil {
		log.Printf("[auth] ERROR: %s - %v", message, err)
		return
	}
	details := ""
	if err != nil {
		details = err.Error()
	}
	globalErrorLogger.LogError(ctx, "auth", message, details, primitive.NilObjectID, userEmail)
}

// LogStripeError logs a Stripe-related error.
func LogStripeError(ctx context.Context, message string, err error, userID primitive.ObjectID) {
	if globalErrorLogger == nil {
		log.Printf("[stripe] ERROR: %s - %v", message, err)
		return
	}
	details := ""
	if err != nil {
		details = err.Error()
	}
	globalErrorLogger.LogError(ctx, "stripe", message, details, userID, "")
}

// LogAIError logs an AI/OpenAI-related error.
func LogAIError(ctx context.Context, message string, err error, userID primitive.ObjectID) {
	if globalErrorLogger == nil {
		log.Printf("[ai] ERROR: %s - %v", message, err)
		return
	}
	details := ""
	if err != nil {
		details = err.Error()
	}
	globalErrorLogger.LogError(ctx, "ai", message, details, userID, "")
}

// LogAPIError logs a general API error.
func LogAPIError(ctx context.Context, message string, err error) {
	if globalErrorLogger == nil {
		log.Printf("[api] ERROR: %s - %v", message, err)
		return
	}
	details := ""
	if err != nil {
		details = err.Error()
	}
	globalErrorLogger.LogError(ctx, "api", message, details, primitive.NilObjectID, "")
}


