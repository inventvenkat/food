#!/bin/bash

docker compose build --no-cache client
docker compose build --no-cache server
docker compose up -d