package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ErrorLog represents an application error log entry.
type ErrorLog struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
	Level     string             `bson:"level" json:"level"` // error, warning, info
	Category  string             `bson:"category" json:"category"` // auth, email, stripe, ai, api
	Message   string             `bson:"message" json:"message"`
	Details   string             `bson:"details,omitempty" json:"details,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id,omitempty" json:"userId,omitempty"`
	UserEmail string             `bson:"user_email,omitempty" json:"userEmail,omitempty"`
	RequestID string             `bson:"request_id,omitempty" json:"requestId,omitempty"`
	Stack     string             `bson:"stack,omitempty" json:"stack,omitempty"`
}


