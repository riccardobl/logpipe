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

if [ -z "$LOGPIPE_ENDPOINT" ]; then
  LOGPIPE_ENDPOINT="http://127.0.0.1:7068"
fi

if [ -z "$LOGPIPE_FORMAT" ]; then
  LOGPIPE_FORMAT="cconsole"
fi

if [ -z "$LOGPIPE_AUTHKEY" ]; then
  LOGPIPE_AUTHKEY=""
fi

endpoint="$LOGPIPE_ENDPOINT/write?format=$LOGPIPE_FORMAT&authKey=$LOGPIPE_AUTHKEY"

current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Sending log to $endpoint"
curl -X POST $endpoint \
     -H "Content-Type: application/json" \
     -d '{
           "logger": "exampleLogger",
           "level": "'"$level"'",
           "message": "'"$log"'",
           "createdAt": "'"$current_date"'",
           "tags": '"$tags"'
         }'
echo ""