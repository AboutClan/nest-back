#!/bin/bash
cd /home/ec2-user/app
docker pull 835080864477.dkr.ecr.ap-northeast-2.amazonaws.com/beming/about
docker stop nest-app || true
docker rm nest-app || true
docker run -d --name my-app -p 80:3001 835080864477.dkr.ecr.ap-northeast-2.amazonaws.com/beming/about