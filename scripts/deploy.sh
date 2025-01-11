#!/bin/bash
cd /home/ubuntu/app
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about

# Secrets Manager에서 한 번만 시크릿 가져오기
SECRETS=$(aws secretsmanager get-secret-value --secret-id about/backend --query SecretString --output text)

# 필요한 시크릿 환경 변수 설정
MONGODB_URI=$(echo $SECRETS | jq -r '.MONGODB_URI')
cryptoKey=$(echo $SECRETS | jq -r '.cryptoKey')
PAPERTRAIL_API_TOKEN=$(echo $SECRETS | jq -r '.PAPERTRAIL_API_TOKEN')
AWS_KEY=$(echo $SECRETS | jq -r '.AWS_KEY')
AWS_ACCESS_KEY=$(echo $SECRETS | jq -r '.AWS_ACCESS_KEY')
PUBLIC_KEY=$(echo $SECRETS | jq -r '.PUBLIC_KEY')
PRIVATE_KEY=$(echo $SECRETS | jq -r '.PRIVATE_KEY')
NEW_RELIC_APP_NAME=$(echo $SECRETS | jq -r '.NEW_RELIC_APP_NAME')
NEW_RELIC_LICENSE_KEY=$(echo $SECRETS | jq -r '.NEW_RELIC_LICENSE_KEY')
NEW_RELIC_LOG=$(echo $SECRETS | jq -r '.NEW_RELIC_LOG')
NEW_RELIC_NO_CONFIG_FILE=$(echo $SECRETS | jq -r '.NEW_RELIC_NO_CONFIG_FILE')
NEW_RELIC_ENABLED=$(echo $SECRETS | jq -r '.NEW_RELIC_ENABLED')

docker pull 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest
docker stop nest-app || true
docker rm nest-app || true
docker run -d --name nest-app \
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