#!/bin/bash

set -e

VISIBLE_FOLDER_SERVER="$VISIBLE_FOLDER_SERVER"
VISIBLE_FOLDER_CLIENT="$VISIBLE_FOLDER_CLIENT"
VISIBLE_FOLDER_DEVCONTAINER="${VISIBLE_FOLDER_CLIENT}_${VISIBLE_FOLDER_SERVER}"

if [ -z "$VISIBLE_FOLDER_CLIENT" ]; then
    echo "Error: VISIBLE_FOLDER_CLIENT is not set, setting it to default"
    VISIBLE_FOLDER_CLIENT="DEFAULT"
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
WORKSPACE_DIR="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"
SERVER_DIR="$WORKSPACE_DIR/server"
CLIENT_DIR="$WORKSPACE_DIR/client"
DEVCONTATINER_DIR="$WORKSPACE_DIR/.devcontainer"
SETTINGS_FILE="$WORKSPACE_DIR/.vscode/settings.json"

echo "Workspace directory: $WORKSPACE_DIR"
echo "Server directory: $SERVER_DIR"
echo "Visible server folder: $VISIBLE_FOLDER_SERVER"
echo "Visible client folder: $VISIBLE_FOLDER_CLIENT"

if [ ! -d "$SERVER_DIR" ]; then
    echo "Error: Server directory not found at $SERVER_DIR"
    exit 1
fi

if [ ! -d "$DEVCONTATINER_DIR" ]; then
    echo "Error: .devcontainer directory not found at $DEVCONTATINER_DIR"
    exit 1
fi

if [ -z "$VISIBLE_FOLDER_SERVER" ]; then
    echo "Error: VISIBLE_FOLDER_SERVER is not set"
    exit 1
fi

mkdir -p "$(dirname "$SETTINGS_FILE")"

echo "{
  \"files.exclude\": {" > "$SETTINGS_FILE"

first=true
for dir in "$SERVER_DIR"/*/ ; do
    dir_name=$(basename "$dir")
    if [ -d "$dir" ] && [ "$dir_name" != "$VISIBLE_FOLDER_SERVER" ] && ([ "$dir_name" != "shared" ] || [ "$VISIBLE_FOLDER_CLIENT" != "html" ]); then
        if [ "$first" = true ] ; then
            first=false
        else
            echo "," >> "$SETTINGS_FILE"
        fi
        echo -n "    \"**/server/$dir_name\": true" >> "$SETTINGS_FILE"
    fi
done

for dir in "$DEVCONTATINER_DIR"/*/ ; do
    dir_name=$(basename "$dir")
    if [ -d "$dir" ] && [ "$dir_name" != "$VISIBLE_FOLDER_SERVER" ] && [ "$dir_name" != "$VISIBLE_FOLDER_DEVCONTAINER" ]; then
        if [ "$first" = true ] ; then
            first=false
        else
            echo "," >> "$SETTINGS_FILE"
        fi
        echo -n "    \"**/.devcontainer/$dir_name\": true" >> "$SETTINGS_FILE"
    fi
done

for dir in "$CLIENT_DIR"/*/ ; do
    dir_name=$(basename "$dir")
    if [ -d "$dir" ] && [ "$dir_name" != "$VISIBLE_FOLDER_CLIENT" ]; then
        if [ "$first" = true ] ; then
            first=false
        else
            echo "," >> "$SETTINGS_FILE"
        fi
        echo -n "    \"**/client/$dir_name\": true" >> "$SETTINGS_FILE"
    fi
done

echo "
  }
}" >> "$SETTINGS_FILE"

echo "VS Code settings updated to show only $VISIBLE_FOLDER_SERVER and $VISIBLE_FOLDER_CLIENT folder in server directory."
echo "Contents of $SETTINGS_FILE:"
cat "$SETTINGS_FILE"