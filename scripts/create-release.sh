#!/bin/bash

# AniSurge Release Script
# This script helps create a new release by updating versions and creating tags

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format. Use semantic versioning (e.g., 2.26.5)"
        exit 1
    fi
}

# Function to validate version code
validate_version_code() {
    local code=$1
    if [[ ! $code =~ ^[0-9]+$ ]]; then
        print_error "Version code must be a positive integer"
        exit 1
    fi
}

# Function to get current version
get_current_version() {
    node -p "require('./package.json').version"
}

# Function to get current version code
get_current_version_code() {
    node -p "require('./app.json').expo.android.versionCode"
}

# Function to check if we're on main/master branch
check_branch() {
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        print_warning "You're not on main/master branch (current: $current_branch)"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Release cancelled"
            exit 1
        fi
    fi
}

# Function to check for uncommitted changes
check_clean_working_directory() {
    if ! git diff-index --quiet HEAD --; then
        print_error "You have uncommitted changes. Please commit or stash them first."
        git status --short
        exit 1
    fi
}

# Function to update version
update_version() {
    local version=$1
    local version_code=$2
    
    print_status "Updating version to $version (code: $version_code)..."
    node scripts/version-manager.js update "$version" "$version_code"
    print_success "Version updated successfully"
}

# Function to commit version changes
commit_version_changes() {
    local version=$1
    
    print_status "Committing version changes..."
    git add package.json app.json constants/appConfig.ts
    git commit -m "chore: bump version to $version"
    print_success "Version changes committed"
}

# Function to create and push tag
create_tag() {
    local version=$1
    
    print_status "Creating tag v$version..."
    git tag -a "v$version" -m "Release v$version"
    print_success "Tag v$version created"
    
    print_status "Pushing changes and tag..."
    git push origin HEAD
    git push origin "v$version"
    print_success "Changes and tag pushed to remote"
}

# Function to show release summary
show_summary() {
    local version=$1
    local version_code=$2
    
    echo
    print_success "Release v$version created successfully!"
    echo
    echo "📋 Release Summary:"
    echo "   Version: $version"
    echo "   Version Code: $version_code"
    echo "   Tag: v$version"
    echo
    echo "🚀 Next steps:"
    echo "   1. GitHub Actions will automatically build the APKs"
    echo "   2. A release will be created with the APK files"
    echo "   3. Check the Actions tab for build progress"
    echo
    echo "🔗 View release: https://github.com/$GITHUB_REPOSITORY/releases/tag/v$version"
}

# Main function
main() {
    echo "🚀 AniSurge Release Script"
    echo "========================="
    echo
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check for required files
    if [[ ! -f "package.json" || ! -f "app.json" || ! -f "constants/appConfig.ts" ]]; then
        print_error "Required files not found. Make sure you're in the project root."
        exit 1
    fi
    
    # Get current version info
    local current_version=$(get_current_version)
    local current_version_code=$(get_current_version_code)
    
    echo "Current version: $current_version (code: $current_version_code)"
    echo
    
    # Parse command line arguments
    if [[ $# -eq 0 ]]; then
        # Interactive mode
        echo "Choose release type:"
        echo "1) Patch release (e.g., $current_version → $(echo $current_version | awk -F. '{print $1"."$2"."($3+1)}'))"
        echo "2) Minor release (e.g., $current_version → $(echo $current_version | awk -F. '{print $1"."($2+1)".0"}'))"
        echo "3) Major release (e.g., $current_version → $(echo $current_version | awk -F. '{print ($1+1)".0.0"}'))"
        echo "4) Custom version"
        echo
        read -p "Enter choice (1-4): " choice
        
        case $choice in
            1)
                local new_version=$(echo $current_version | awk -F. '{print $1"."$2"."($3+1)}')
                local new_version_code=$((current_version_code + 1))
                ;;
            2)
                local new_version=$(echo $current_version | awk -F. '{print $1"."($2+1)".0"}')
                local new_version_code=$((current_version_code + 10))
                ;;
            3)
                local new_version=$(echo $current_version | awk -F. '{print ($1+1)".0.0"}')
                local new_version_code=$((current_version_code + 100))
                ;;
            4)
                read -p "Enter new version (e.g., 2.26.5): " new_version
                read -p "Enter new version code (e.g., 1): " new_version_code
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
    elif [[ $# -eq 2 ]]; then
        # Command line mode
        local new_version=$1
        local new_version_code=$2
    else
        echo "Usage: $0 [version] [version_code]"
        echo "       $0                    # Interactive mode"
        echo
        echo "Examples:"
        echo "  $0 2.26.5 1              # Custom version"
        echo "  $0                        # Interactive mode"
        exit 1
    fi
    
    # Validate inputs
    validate_version "$new_version"
    validate_version_code "$new_version_code"
    
    # Pre-flight checks
    check_branch
    check_clean_working_directory
    
    # Confirm release
    echo
    print_warning "About to create release v$new_version (code: $new_version_code)"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Release cancelled"
        exit 1
    fi
    
    # Execute release steps
    update_version "$new_version" "$new_version_code"
    commit_version_changes "$new_version"
    create_tag "$new_version"
    show_summary "$new_version" "$new_version_code"
}

# Run main function
main "$@"
