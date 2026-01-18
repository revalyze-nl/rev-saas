package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

var (
	// ErrEmailAlreadyInUse is returned when the email is already registered.
	ErrEmailAlreadyInUse = errors.New("email is already in use")
	// ErrInvalidCredentials is returned when email or password is wrong.
	ErrInvalidCredentials = errors.New("invalid email or password")
	// ErrEmailNotVerified is returned when user tries to login without verifying email.
	ErrEmailNotVerified = errors.New("please verify your email before logging in")
	// ErrInvalidVerificationToken is returned when the verification token is invalid.
	ErrInvalidVerificationToken = errors.New("invalid verification token")
	// ErrVerificationTokenExpired is returned when the verification token has expired.
	ErrVerificationTokenExpired = errors.New("verification token has expired")
	// ErrResendCooldown is returned when trying to resend verification email too soon.
	ErrResendCooldown = errors.New("please wait before requesting another verification email")
)

// SignupInput contains all the data needed to register a new user.
type SignupInput struct {
	Email          string
	Password       string
	FullName       string
	Role           string
	CompanyName    string
	CompanyWebsite string
	MRRRange       string
	HeardFrom      string
	AcceptedTerms  bool
}

// SignupResult contains the results of a successful signup.
type SignupResult struct {
	User    *model.User
	Company *model.Company
}

// AuthService handles authentication logic.
type AuthService struct {
	users        *mongorepo.UserRepository
	companies    *mongorepo.CompanyRepository
	userMetadata *mongorepo.UserMetadataRepository
	jwt          *JWTService
	emailService *EmailService
	appPublicURL string
}

// NewAuthService creates a new AuthService.
func NewAuthService(
	users *mongorepo.UserRepository,
	companies *mongorepo.CompanyRepository,
	userMetadata *mongorepo.UserMetadataRepository,
	jwt *JWTService,
	emailService *EmailService,
	appPublicURL string,
) *AuthService {
	return &AuthService{
		users:        users,
		companies:    companies,
		userMetadata: userMetadata,
		jwt:          jwt,
		emailService: emailService,
		appPublicURL: appPublicURL,
	}
}

// GetAppPublicURL returns the public URL for the app.
func (s *AuthService) GetAppPublicURL() string {
	return s.appPublicURL
}

// normalizeEmail lowercases and trims the email.
func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

// Register creates a new user account with company and metadata.
func (s *AuthService) Register(ctx context.Context, input SignupInput) (*SignupResult, error) {
	input.Email = normalizeEmail(input.Email)

	// Check if email is already in use
	existing, err := s.users.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailAlreadyInUse
	}

	// Validate password length
	if len(input.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	// Hash the password
	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Generate verification token
	token, tokenHash, expiresAt, err := s.generateVerificationToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate verification token: %w", err)
	}

	// Create user
	now := time.Now().UTC()
	user := &model.User{
		Email:                input.Email,
		Password:             string(hashed),
		FullName:             strings.TrimSpace(input.FullName),
		Role:                 strings.TrimSpace(input.Role),
		Plan:                 model.PlanFree, // Default to free plan
		CreatedAt:            now,
		EmailVerified:        false,
		EmailVerifyTokenHash: tokenHash,
		EmailVerifyExpiresAt: &expiresAt,
		EmailVerifySentAt:    &now,
		AcceptedTerms:        input.AcceptedTerms,
		AcceptedTermsAt:      &now,
	}

	// Set trial expiry for free plan
	trialLimits := GetPlanLimits(model.PlanFree)
	if trialLimits.TrialDays > 0 {
		user.TrialExpiresAt = now.AddDate(0, 0, trialLimits.TrialDays)
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	// Send verification email
	if s.emailService != nil {
		if err := s.emailService.SendVerificationEmail(ctx, user.Email, token); err != nil {
			log.Printf("[auth] Failed to send verification email to %s: %v", user.Email, err)
			LogEmailError(ctx, "Failed to send verification email", err, user.Email)
			// Continue with signup - user can request resend later
		}
	}

	// Create company if company name is provided
	var company *model.Company
	if strings.TrimSpace(input.CompanyName) != "" {
		company = &model.Company{
			UserID:   user.ID,
			Name:     strings.TrimSpace(input.CompanyName),
			Website:  strings.TrimSpace(input.CompanyWebsite),
			MRRRange: strings.TrimSpace(input.MRRRange),
		}

		if err := s.companies.Create(ctx, company); err != nil {
			// Log error but don't fail signup
			// In production, you might want to handle this differently
		}
	}

	// Create user metadata if heard_from is provided
	if strings.TrimSpace(input.HeardFrom) != "" {
		metadata := &model.UserMetadata{
			UserID:    user.ID,
			HeardFrom: strings.TrimSpace(input.HeardFrom),
		}

		if err := s.userMetadata.Create(ctx, metadata); err != nil {
			// Log error but don't fail signup
		}
	}

	// Don't return the password hash
	user.Password = ""

	return &SignupResult{
		User:    user,
		Company: company,
	}, nil
}

// Login authenticates a user and returns a JWT token.
func (s *AuthService) Login(ctx context.Context, email, password string) (string, *model.User, *model.Company, error) {
	email = normalizeEmail(email)

	// Find user by email
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return "", nil, nil, err
	}
	if user == nil {
		return "", nil, nil, ErrInvalidCredentials
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", nil, nil, ErrInvalidCredentials
	}

	// Check if email is verified
	if !user.EmailVerified {
		return "", nil, nil, ErrEmailNotVerified
	}

	// Generate JWT token
	token, err := s.jwt.GenerateToken(user.ID.Hex())
	if err != nil {
		return "", nil, nil, err
	}

	// Get user's company
	company, _ := s.companies.GetByUserID(ctx, user.ID)

	// Mask password before returning
	user.Password = ""

	return token, user, company, nil
}

// GetUserByID retrieves a user by their ID string.
func (s *AuthService) GetUserByID(ctx context.Context, id string) (*model.User, error) {
	user, err := s.users.GetByIDString(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Mask password before returning
	user.Password = ""
	return user, nil
}

// GetUserWithCompany retrieves a user and their company by user ID.
func (s *AuthService) GetUserWithCompany(ctx context.Context, userID string) (*model.User, *model.Company, error) {
	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}

	company, _ := s.companies.GetByUserID(ctx, user.ID)

	return user, company, nil
}

// GenerateTokenForUser generates a JWT token for a user ID.
func (s *AuthService) GenerateTokenForUser(userID string) (string, error) {
	return s.jwt.GenerateToken(userID)
}

// generateVerificationToken creates a new verification token and returns the raw token, hash, and expiry.
func (s *AuthService) generateVerificationToken() (token string, hash string, expiresAt time.Time, err error) {
	// Generate 32 random bytes
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", time.Time{}, err
	}

	// Encode to hex for URL-safe token
	token = hex.EncodeToString(tokenBytes)

	// Hash the token for storage
	hashBytes := sha256.Sum256([]byte(token))
	hash = hex.EncodeToString(hashBytes[:])

	// Set expiry to 30 minutes from now
	expiresAt = time.Now().UTC().Add(30 * time.Minute)

	return token, hash, expiresAt, nil
}

// hashToken hashes a token using SHA256.
func hashToken(token string) string {
	hashBytes := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hashBytes[:])
}

// VerifyEmail verifies a user's email using the provided token.
func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	if token == "" {
		return ErrInvalidVerificationToken
	}

	// Hash the provided token
	tokenHash := hashToken(token)

	// Find user with matching token hash
	user, err := s.users.GetByEmailVerifyTokenHash(ctx, tokenHash)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrInvalidVerificationToken
	}

	// Check if token has expired
	if user.EmailVerifyExpiresAt != nil && time.Now().After(*user.EmailVerifyExpiresAt) {
		return ErrVerificationTokenExpired
	}

	// Update user as verified
	user.EmailVerified = true
	user.EmailVerifyTokenHash = ""
	user.EmailVerifyExpiresAt = nil

	if err := s.users.UpdateEmailVerificationFields(ctx, user.ID, true, "", nil, nil); err != nil {
		return err
	}

	// Send welcome email
	if s.emailService != nil {
		if err := s.emailService.SendWelcomeEmail(ctx, user.Email); err != nil {
			log.Printf("[auth] Failed to send welcome email to %s: %v", user.Email, err)
			LogEmailError(ctx, "Failed to send welcome email", err, user.Email)
			// Don't fail verification if welcome email fails
		}
	}

	return nil
}

// ResendVerificationEmail resends the verification email to a user.
func (s *AuthService) ResendVerificationEmail(ctx context.Context, email string) error {
	email = normalizeEmail(email)

	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return err
	}
	if user == nil {
		// Don't reveal if email exists
		return nil
	}

	// Already verified
	if user.EmailVerified {
		return nil
	}

	// Check cooldown (60 seconds)
	if user.EmailVerifySentAt != nil {
		cooldownEnd := user.EmailVerifySentAt.Add(60 * time.Second)
		if time.Now().Before(cooldownEnd) {
			return ErrResendCooldown
		}
	}

	// Generate new token
	token, tokenHash, expiresAt, err := s.generateVerificationToken()
	if err != nil {
		return err
	}

	// Update user with new token
	now := time.Now().UTC()
	if err := s.users.UpdateEmailVerificationFields(ctx, user.ID, false, tokenHash, &expiresAt, &now); err != nil {
		return err
	}

	// Send verification email
	if s.emailService != nil {
		if err := s.emailService.SendVerificationEmail(ctx, user.Email, token); err != nil {
			log.Printf("[auth] Failed to resend verification email to %s: %v", user.Email, err)
			return fmt.Errorf("failed to send verification email")
		}
	}

	return nil
}

// UpdateProfile updates the user's profile information.
func (s *AuthService) UpdateProfile(ctx context.Context, userId, fullName, role, currency string) (*model.User, error) {
	// Find user first
	user, err := s.GetUserByID(ctx, userId)
	if err != nil {
		return nil, err
	}

	// Update fields
	user.FullName = fullName
	user.Role = role
	if currency != "" {
		user.Currency = currency
	}

	// Persist
	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
