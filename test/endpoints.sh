#!/bin/bash
curl localhost:9200/foo/1234
curl localhost:9200/foo/09.08.2018
curl -X DELETE localhost:9200/foo/5432
curl localhost:9200/bar