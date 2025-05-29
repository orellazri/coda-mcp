#!/bin/bash

# Get current version
CURRENT_VERSION=$(pnpm dlx json -f package.json version)
echo "Current version: $CURRENT_VERSION"

# Prompt for the new version tag
echo "Enter the new version tag (without 'v' prefix, e.g. 1.0.1):"
read VERSION

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version must be in format X.Y.Z (e.g. 1.0.1)"
  exit 1
fi

# Update package.json version
pnpm dlx json -I -f package.json -e "this.version='$VERSION'"

# Commit the change
git add package.json
git commit -m "chore: bump version to $VERSION"

# Create and push the tag
git tag "v$VERSION"
git push origin main
git push --tags

echo "✅ Version bumped to $VERSION and tag v$VERSION pushed!" 
