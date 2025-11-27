.PHONY: help setup install build run dev test test-coverage test-watch lint clean docker-build docker-run docker-stop deploy-staging deploy-prod

# Default target
help: ## Show this help message
	@echo "Booking.com Proxy Service - Development Commands"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Setup and installation
setup: ## Install dependencies and setup development environment
	npm install
	cp config.example.env .env
	@echo "Please edit .env file with your actual configuration values"

install: ## Install npm dependencies
	npm install

# Build commands
build: ## Build the TypeScript application
	npm run build

# Run commands
run: ## Run the compiled application
	npm start

dev: ## Run in development mode with hot reload
	npm run dev

# Testing commands
test: ## Run all tests
	npm test

test-coverage: ## Run tests with coverage report
	npm run test:coverage

test-watch: ## Run tests in watch mode
	npm run test:watch

test-e2e: ## Run end-to-end tests
	docker-compose up -d mongodb redis
	sleep 10
	npm run test:e2e
	docker-compose down

# Code quality
lint: ## Run linting
	npm run lint

lint-fix: ## Run linting with auto-fix
	npm run lint:fix

# Docker commands
docker-build: ## Build Docker image
	docker build -t booking-proxy .

docker-run: ## Run Docker container
	docker run -p 8080:8080 --env-file .env booking-proxy

docker-stop: ## Stop all Docker containers
	docker-compose down

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-logs: ## Show Docker container logs
	docker-compose logs -f app

# Database commands
db-up: ## Start database services
	docker-compose up -d mongodb redis

db-down: ## Stop database services
	docker-compose down mongodb redis

db-reset: ## Reset database (WARNING: This will delete all data)
	docker-compose down -v
	docker-compose up -d mongodb redis

# Deployment commands
deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	# Add your staging deployment commands here
	@echo "Staging deployment not implemented yet"

deploy-prod: ## Deploy to production environment
	@echo "Deploying to production..."
	# Add your production deployment commands here
	@echo "Production deployment not implemented yet"

# Utility commands
clean: ## Clean build artifacts and dependencies
	rm -rf dist
	rm -rf node_modules
	rm -rf coverage
	rm -f .env

health-check: ## Check application health
	curl -f http://localhost:8080/health || echo "Application is not running"

# Development workflow
dev-setup: setup db-up dev ## Complete development setup

# CI/CD commands
ci-test: ## Run tests for CI/CD pipeline
	npm ci
	npm run lint
	npm run build
	npm test

# Database migration (if needed in future)
migrate: ## Run database migrations
	@echo "No migrations needed for current version"

# Backup commands
backup-db: ## Backup MongoDB database
	@echo "Creating database backup..."
	docker exec booking-mongodb mongodump --db booking-proxy --out /backup
	docker cp booking-mongodb:/backup ./backup
	@echo "Backup completed: ./backup"

restore-db: ## Restore MongoDB database from backup
	@echo "Restoring database from backup..."
	docker cp ./backup booking-mongodb:/backup
	docker exec booking-mongodb mongorestore --db booking-proxy /backup/booking-proxy
	@echo "Restore completed"
