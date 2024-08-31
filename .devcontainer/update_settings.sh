#!/bin/bash

set -e

VISIBLE_FOLDER_SERVER="$VISIBLE_FOLDER_SERVER"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
WORKSPACE_DIR="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"
SERVER_DIR="$WORKSPACE_DIR/server"
DEVCONTAINER_DIR="$WORKSPACE_DIR/.devcontainer"

echo "Workspace directory: $WORKSPACE_DIR"
echo "Server directory: $SERVER_DIR"
echo "Devcontainer directory: $DEVCONTAINER_DIR"
echo "Visible server folder: $VISIBLE_FOLDER_SERVER"

if [ ! -d "$SERVER_DIR" ]; then
    echo "Error: Server directory not found at $SERVER_DIR"
    exit 1
fi

if [ ! -d "$DEVCONTAINER_DIR" ]; then
    echo "Error: .devcontainer directory not found at $DEVCONTAINER_DIR"
    exit 1
fi

if [ -z "$VISIBLE_FOLDER_SERVER" ]; then
    echo "Error: VISIBLE_FOLDER_SERVER is not set"
    exit 1
fi

safe_delete() {
    local dir=$1
    local keep=$2
    
    if [ -d "$dir" ]; then
        for subdir in "$dir"/*/ ; do
            if [ -d "$subdir" ] && [ "$(basename "$subdir")" != "$keep" ] && [ "$(basename "$subdir")" != "shared" ]; then
                echo "Deleting $subdir"
                rm -rf "$subdir"
            fi
        done
    else
        echo "Warning: Directory $dir not found"
    fi
}

# Delete unnecessary server folders
safe_delete "$SERVER_DIR" "$VISIBLE_FOLDER_SERVER"

# Delete unnecessary .devcontainer folders
safe_delete "$DEVCONTAINER_DIR" "$VISIBLE_FOLDER_SERVER"

echo "Workspace cleanup completed."