#!/usr/bin/env bash
#   Use this script to test if a given TCP host/port are available

TIMEOUT=15
QUIET=0
HOST=""
PORT=""

echoerr() {
  if [ "$QUIET" -ne 1 ]; then echo "$@" 1>&2; fi
}

usage() {
  cat << USAGE >&2
Usage:
  $0 host:port [-t timeout] [-- command args]
  -h HOST | --host=HOST       Host or IP under test
  -p PORT | --port=PORT       TCP port under test
                              Alternatively, you can specify the host and port as host:port
  -t TIMEOUT | --timeout=TIMEOUT
                              Timeout in seconds, zero for no timeout
  -- COMMAND ARGS             Execute command with args after the test finishes
USAGE
  exit 1
}

wait_for() {
  if [ "$TIMEOUT" -gt 0 ]; then
    echoerr "$0: waiting $TIMEOUT seconds for $HOST:$PORT"
  else
    echoerr "$0: waiting for $HOST:$PORT without timeout"
  fi
  start_ts=$(date +%s)
  while :
  do
    (echo > /dev/tcp/$HOST/$PORT) >/dev/null 2>&1
    result=$?
    if [ $result -eq 0 ]; then
      end_ts=$(date +%s)
      echoerr "$0: $HOST:$PORT is available after $((end_ts - start_ts)) seconds"
      break
    fi
    sleep 1
    now_ts=$(date +%s)
    if [ "$TIMEOUT" -gt 0 ] && [ $((now_ts - start_ts)) -ge "$TIMEOUT" ]; then
      echoerr "$0: timeout occurred after waiting $TIMEOUT seconds for $HOST:$PORT"
      exit 1
    fi
  done
  return $result
}

# process arguments
while [[ $# -gt 0 ]]
do
  case "$1" in
    *:* )
    hostport=(${1//:/ })
    HOST=${hostport[0]}
    PORT=${hostport[1]}
    shift 1
    ;;
    -h)
    HOST="$2"
    if [[ $HOST == "" ]]; then break; fi
    shift 2
    ;;
    --host=*)
    HOST="${1#*=}"
    shift 1
    ;;
    -p)
    PORT="$2"
    if [[ $PORT == "" ]]; then break; fi
    shift 2
    ;;
    --port=*)
    PORT="${1#*=}"
    shift 1
    ;;
    -t)
    TIMEOUT="$2"
    if [[ $TIMEOUT == "" ]]; then break; fi
    shift 2
    ;;
    --timeout=*)
    TIMEOUT="${1#*=}"
    shift 1
    ;;
    --)
    shift
    CLI=("$@")
    break
    ;;
    --help)
    usage
    ;;
    *)
    echoerr "Unknown argument: $1"
    usage
    ;;
  esac
done

if [[ "$HOST" == "" || "$PORT" == "" ]]; then
  echoerr "Error: you need to provide a host and port to test."
  usage
fi

wait_for

if [[ $CLI != "" ]]; then
  exec "${CLI[@]}"
else
  exit 0
fi
