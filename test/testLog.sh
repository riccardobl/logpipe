#!/bin/bash

log=$1
if [ -z "$log" ]; then
  log="This is a test log"
fi


level=$2
if [ -z "$level" ]; then
  level="info"
fi

tags=$3
if [ -z "$tags" ]; then
  tags='["test","example"]'
fi

current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -X POST http://localhost:7068/write?format=console \
     -H "Content-Type: application/json" \
     -d '{
           "logger": "exampleLogger",
           "level": "'"$level"'",
           "message": "'"$log"'",
           "createdAt": "'"$current_date"'",
           "tags": '"$tags"'
         }'
echo ""