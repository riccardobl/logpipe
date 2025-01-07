#!/bin/bash

if [ -z "$LOGPIPE_ENDPOINT" ]; then
  LOGPIPE_ENDPOINT="http://127.0.0.1:7068"
fi

if [ -z "$LOGPIPE_FORMAT" ]; then
  LOGPIPE_FORMAT="cconsole"
fi

if [ -z "$LOGPIPE_AUTHKEY" ]; then
  LOGPIPE_AUTHKEY=""
fi

endpoint="$LOGPIPE_ENDPOINT/stream?format=$LOGPIPE_FORMAT&authKey=$LOGPIPE_AUTHKEY&limit=100"
echo "Connecting to $endpoint"
npx wscat --no-color --connect $endpoint
