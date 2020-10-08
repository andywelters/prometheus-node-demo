#!/bin/bash
curl localhost:9200/api/v1/some-resource/404
curl localhost:9200/api/v1/some-resource/301
curl localhost:9200/api/v1/some-resource/500
curl localhost:9200/api/v1/some-resource
curl localhost:9200/api/v1/some-resource/0
curl localhost:9200/api/v1/some-resource/1234
curl localhost:9200/rest/v1/some-resource/1234
curl localhost:9200/rest/v1/some-resource/09.08.2018
curl localhost:9200/oauth/v1/some-resource/4321?filter[something]=123456
curl -X DELETE localhost:9200/rest/v1/some-resource/5432
curl localhost:9200/oauth/v1?filter[something]=123456
curl localhost:9200/public/v1?var=delta&another=beta
for i in {1..3}; do \
  curl -X POST -H "Content-Type: application/json" -d \
    '{"number":"'$i'"}' "http://localhost:9200/rest/v1/some-resource/9876"; \
done
for i in {1..3}; do \
  curl -X PATCH -H "Content-Type: application/json" -d \
    '{"number":"'$i'"}' "http://localhost:9200/rest/v1/some-resource/9876"; \
done