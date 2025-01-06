#!/bin/bash
cd /home/ubuntu/app
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about
docker pull 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest
docker stop nest-app || true
docker rm nest-app || true
docker run -d --name my-app -p 80:3001 294951093594.dkr.ecr.ap-northeast-2.amazonaws.com/about:latest