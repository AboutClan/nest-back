#!/bin/bash
cd /home/ec2-user/app
docker pull 835080864477.dkr.ecr.ap-northeast-2.amazonaws.com/beming/about:latest
docker stop my-app || true
docker rm my-app || true
docker run -d --name my-app -p 80:3000 835080864477.dkr.ecr.ap-northeast-2.amazonaws.com/beming/about