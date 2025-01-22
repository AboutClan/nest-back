#!/bin/bash

set -e  # 오류 발생 시 즉시 종료

# 디렉토리 권한 설정
sudo chmod -R 775 /home/ubuntu/app
sudo chown -R ubuntu:ubuntu /home/ubuntu/app
# 디렉토리 이동
cd /home/ubuntu/app

# AWS ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about

# Secrets Manager에서 시크릿 가져오기
SECRETS=$(aws secretsmanager get-secret-value --secret-id about/backend --query SecretString --output text)

# .env 파일 생성
sudo cat <<EOF > /home/ubuntu/app/.env
MONGODB_URI=$(echo "$SECRETS" | jq -r '.MONGODB_URI')
cryptoKey=$(echo "$SECRETS" | jq -r '.cryptoKey')
PAPERTRAIL_API_TOKEN=$(echo "$SECRETS" | jq -r '.PAPERTRAIL_API_TOKEN')
AWS_KEY=$(echo "$SECRETS" | jq -r '.AWS_KEY')
AWS_ACCESS_KEY=$(echo "$SECRETS" | jq -r '.AWS_ACCESS_KEY')
PUBLIC_KEY=$(echo "$SECRETS" | jq -r '.PUBLIC_KEY')
PRIVATE_KEY=$(echo "$SECRETS" | jq -r '.PRIVATE_KEY' | sed 's/\\n/\n/g')
NEW_RELIC_APP_NAME=$(echo "$SECRETS" | jq -r '.NEW_RELIC_APP_NAME')
NEW_RELIC_LICENSE_KEY=$(echo "$SECRETS" | jq -r '.NEW_RELIC_LICENSE_KEY')
NEW_RELIC_LOG=$(echo "$SECRETS" | jq -r '.NEW_RELIC_LOG')
NEW_RELIC_NO_CONFIG_FILE=$(echo "$SECRETS" | jq -r '.NEW_RELIC_NO_CONFIG_FILE')
NEW_RELIC_ENABLED=$(echo "$SECRETS" | jq -r '.NEW_RELIC_ENABLED')
PORTONE_SECRET=$(echo "$SECRETS" | jq -r '.PORTONE_SECRET')
PORTONE_WEBHOOK_SECRET=$(echo "$SECRETS" | jq -r '.PORTONE_WEBHOOK_SECRET')
EOF

echo ".env file created successfully."

# Docker 이미지 pull
docker pull 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest

# 기존 컨테이너 중지 및 삭제
docker stop nest-app || true
docker rm nest-app || true

# 새 컨테이너 실행
docker run -d --name nest-app \
  --env-file /home/ubuntu/app/.env \
  -p 3001:3001 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest