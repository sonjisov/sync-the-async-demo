# Syn the Async
A demo app showcasing how asynchronously envoked microservices can report back their execution status to a synchronously responding Web API.
Related to the Sync the Async talk at Serverless Auckland 11/12/2018

## Cloudformation templates
See **cloudformation** folder to find cloudformtaion templates describing an SNS topic, a Redis claster and underlying networking bits (VPC, etc.). The vpc tempalte should be deployed before the elasticache template.

## Serverless application
See **serverless-redis** folder to find the 'Startship review system' application used during the demo. Use Serverless framework to deploy it.
npm install serverless -g
(from serverless-project folder) sls deploy.

## IMPORTANT
Some AWS resources created by the CF templates presented don't are not available on the free tier! Make sure you delete them when not used to avoid charges. 