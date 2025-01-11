#!/bin/bash
cd /home/ubuntu/app
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about
docker pull 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest
docker stop nest-app || true
docker rm nest-app || true
docker run -d --name my-app \
    -e MONGODB_URI="$MONGODB_URI" \
    -e cryptoKey="$cryptoKey" \
    -e PAPERTRAIL_API_TOKEN="$PAPERTRAIL_API_TOKEN" \
    -e AWS_KEY="$AWS_KEY" \
    -e AWS_ACCESS_KEY="$AWS_ACCESS_KEY" \
    -e PUBLIC_KEY="$PUBLIC_KEY" \
    -e PRIVATE_KEY="$PRIVATE_KEY" \
    -e NEW_RELIC_APP_NAME="$NEW_RELIC_APP_NAME" \
    -e NEW_RELIC_LICENSE_KEY="$NEW_RELIC_LICENSE_KEY" \
    -e NEW_RELIC_LOG="$NEW_RELIC_LOG" \
    -e NEW_RELIC_NO_CONFIG_FILE="$NEW_RELIC_NO_CONFIG_FILE" \
    -e NEW_RELIC_ENABLED="$NEW_RELIC_ENABLED" \
    -p 3001:3001 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest