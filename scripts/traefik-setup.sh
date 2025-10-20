#!/bin/bash

# Traefik Setup and Management Script
# This script helps with Traefik configuration and SSL certificate management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TRAEFIK_DIR="$PROJECT_DIR/traefik"
CERTS_DIR="$PROJECT_DIR/certs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (needed for some operations)
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. This is not recommended for development."
    fi
}

# Create necessary directories
setup_directories() {
    log_info "Setting up Traefik directories..."
    
    mkdir -p "$CERTS_DIR"
    mkdir -p "$TRAEFIK_DIR/logs"
    
    # Set proper permissions for certificates directory
    chmod 600 "$CERTS_DIR" 2>/dev/null || true
    
    log_success "Directories created successfully"
}

# Create external network for Traefik
setup_network() {
    log_info "Setting up Docker network..."
    
    if ! docker network ls | grep -q "web"; then
        docker network create web
        log_success "Created 'web' network"
    else
        log_info "Network 'web' already exists"
    fi
}

# Generate basic auth hash for Traefik dashboard
generate_auth() {
    local username="${1:-admin}"
    local password="${2}"
    
    if [[ -z "$password" ]]; then
        read -s -p "Enter password for Traefik dashboard: " password
        echo
    fi
    
    if command -v htpasswd >/dev/null 2>&1; then
        htpasswd -nb "$username" "$password"
    elif command -v openssl >/dev/null 2>&1; then
        echo "$username:$(openssl passwd -apr1 "$password")"
    else
        log_error "Neither htpasswd nor openssl found. Please install apache2-utils or openssl."
        exit 1
    fi
}

# Validate Traefik configuration
validate_config() {
    log_info "Validating Traefik configuration..."
    
    if [[ ! -f "$TRAEFIK_DIR/traefik.yml" ]]; then
        log_error "Traefik configuration file not found: $TRAEFIK_DIR/traefik.yml"
        exit 1
    fi
    
    # Check if dynamic configuration directory exists
    if [[ ! -d "$TRAEFIK_DIR/dynamic" ]]; then
        log_error "Dynamic configuration directory not found: $TRAEFIK_DIR/dynamic"
        exit 1
    fi
    
    # Validate YAML syntax (if yq is available)
    if command -v yq >/dev/null 2>&1; then
        yq eval '.' "$TRAEFIK_DIR/traefik.yml" >/dev/null
        log_success "Traefik configuration is valid"
    else
        log_warning "yq not found. Skipping YAML validation."
    fi
}

# Check SSL certificates
check_certificates() {
    log_info "Checking SSL certificates..."
    
    local acme_file="$CERTS_DIR/acme.json"
    
    if [[ -f "$acme_file" ]]; then
        local cert_count=$(jq -r '.letsencrypt.Certificates | length' "$acme_file" 2>/dev/null || echo "0")
        log_info "Found $cert_count certificates in ACME storage"
        
        # Check certificate expiration (if jq is available)
        if command -v jq >/dev/null 2>&1; then
            jq -r '.letsencrypt.Certificates[] | select(.certificate != null) | .domain.main + " expires: " + (.certificate | @base64d | split("\n")[1] | split("=")[1])' "$acme_file" 2>/dev/null || true
        fi
    else
        log_info "No ACME certificates found. They will be generated on first request."
    fi
}

# Start Traefik services
start_traefik() {
    log_info "Starting Traefik services..."
    
    cd "$PROJECT_DIR"
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        log_error ".env file not found. Please create it from .env.example"
        exit 1
    fi
    
    # Start only Traefik service
    docker-compose up -d traefik
    
    log_success "Traefik started successfully"
    log_info "Dashboard available at: https://traefik.\${DOMAIN}"
}

# Stop Traefik services
stop_traefik() {
    log_info "Stopping Traefik services..."
    
    cd "$PROJECT_DIR"
    docker-compose stop traefik
    
    log_success "Traefik stopped successfully"
}

# Show Traefik logs
show_logs() {
    local lines="${1:-50}"
    
    log_info "Showing last $lines lines of Traefik logs..."
    docker-compose logs --tail="$lines" traefik
}

# Backup certificates
backup_certificates() {
    local backup_dir="${1:-./backups}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    log_info "Backing up certificates..."
    
    mkdir -p "$backup_dir"
    
    if [[ -f "$CERTS_DIR/acme.json" ]]; then
        cp "$CERTS_DIR/acme.json" "$backup_dir/acme_$timestamp.json"
        log_success "Certificates backed up to: $backup_dir/acme_$timestamp.json"
    else
        log_warning "No certificates to backup"
    fi
}

# Restore certificates
restore_certificates() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        log_error "Please specify backup file to restore"
        exit 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring certificates from: $backup_file"
    
    # Stop Traefik before restoring
    stop_traefik
    
    # Backup current certificates
    if [[ -f "$CERTS_DIR/acme.json" ]]; then
        mv "$CERTS_DIR/acme.json" "$CERTS_DIR/acme.json.bak"
    fi
    
    # Restore certificates
    cp "$backup_file" "$CERTS_DIR/acme.json"
    chmod 600 "$CERTS_DIR/acme.json"
    
    log_success "Certificates restored successfully"
    log_info "Start Traefik to apply restored certificates"
}

# Show help
show_help() {
    echo "Traefik Setup and Management Script"
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  setup                 Setup Traefik directories and network"
    echo "  validate              Validate Traefik configuration"
    echo "  start                 Start Traefik services"
    echo "  stop                  Stop Traefik services"
    echo "  restart               Restart Traefik services"
    echo "  logs [lines]          Show Traefik logs (default: 50 lines)"
    echo "  auth [user] [pass]    Generate basic auth hash"
    echo "  certs                 Check SSL certificates"
    echo "  backup [dir]          Backup certificates"
    echo "  restore <file>        Restore certificates from backup"
    echo "  status                Show Traefik status"
    echo "  help                  Show this help message"
    echo
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 auth admin mypassword"
    echo "  $0 logs 100"
    echo "  $0 backup ./cert-backups"
}

# Show status
show_status() {
    log_info "Traefik Status:"
    
    # Check if container is running
    if docker-compose ps traefik | grep -q "Up"; then
        log_success "Traefik container is running"
    else
        log_warning "Traefik container is not running"
    fi
    
    # Check network
    if docker network ls | grep -q "web"; then
        log_success "Docker network 'web' exists"
    else
        log_warning "Docker network 'web' does not exist"
    fi
    
    # Check certificates
    check_certificates
}

# Main script logic
main() {
    case "${1:-help}" in
        setup)
            check_root
            setup_directories
            setup_network
            validate_config
            ;;
        validate)
            validate_config
            ;;
        start)
            start_traefik
            ;;
        stop)
            stop_traefik
            ;;
        restart)
            stop_traefik
            sleep 2
            start_traefik
            ;;
        logs)
            show_logs "$2"
            ;;
        auth)
            generate_auth "$2" "$3"
            ;;
        certs)
            check_certificates
            ;;
        backup)
            backup_certificates "$2"
            ;;
        restore)
            restore_certificates "$2"
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"