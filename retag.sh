#!/bin/bash

# Define the tag name
TAG_NAME="v0.0.1"

# Check if the tag exists locally
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "Tag '$TAG_NAME' exists locally. Deleting it..."
  git tag -d "$TAG_NAME"
fi

# Check if the tag exists remotely
if git ls-remote --tags origin | grep -q "refs/tags/$TAG_NAME"; then
  echo "Tag '$TAG_NAME' exists remotely. Deleting it..."
  git push origin --delete "$TAG_NAME"
fi

# Create the new tag
echo "Creating tag '$TAG_NAME'..."
git tag "$TAG_NAME"

# Push the tag to the remote repository
echo "Pushing tag '$TAG_NAME' to remote repository..."
git push origin "$TAG_NAME"

echo "Tag '$TAG_NAME' created and pushed successfully."