# Design monitoring for the new API nodes
https://docs.google.com/document/d/1uVwz3A3B3vG2fgD-pGrM2dkkfzUIzZR4rD4qhQoWjSE/edit?usp=sharing

## node

run `npm i`

run `node app/index.js`

The node program will present an endpoint for metrics on a port. Can view them at http://localhost:9200/metrics

## cluster

run `node app/cluster.js`

The node program will present an endpoint for cluster metrics on a port. Can view cluster metrics at http://localhost:9200/metrics

The node program will present an endpoint for worker metrics at http://localhost:9200/worker-metrics

## advanced

run `node app/advanced.js`

The node program will present an endpoint for metrics on a port. Can view metrics at http://localhost:9200/metrics

This includes websocket metrics, extra garbage collecting metrics, and http request metrics (FUTURE).

## prometheus

get it
`wget https://github.com/prometheus/prometheus/releases/download/v2.21.0/prometheus-2.21.0.linux-amd64.tar.gz`

unzip it
`tar xvfz prometheus-*.tar.gz`

move it where you want (you can see where I put it in my case)

run `../prometheus/prometheus --config.file=/home/awelters/Desktop/Alula/prometheus-node-demo/prometheus.yml`

Prometheus will scrape the node endpoint

Can see prometheus data at http://localhost:9090/

## grafana

get it
`wget https://dl.grafana.com/oss/release/grafana-7.1.5.linux-amd64.tar.gz`

unzip it
`tar -zxvf grafana-*.tar.gz`

move it where you want (you can see where I put it in my case)

run `../grafana/bin/grafana-server -config /home/awelters/Desktop/Alula/grafana/conf/defaults.ini -homepath /home/awelters/Desktop/Alula/grafana`

Setup grafana with the grafana-dashboard.json in this repo by 
1. Going to http://localhost:3000/
2. Logging in with default username and password of "admin"
3. Setting up the Prometheus Data Source (must specify the server uri of http://localhost:9090/)
4. Import grafana-dashboard.json to create the Dashboard

## Generate Metrics

run `sudo apt install apache2-utils`

Generate some load on our application using Apache ab in order to get some data into Prometheus. For example, hitting the API 500,000 times with 100 concurrent requests at a time.

run `sudo apt install apache2-utils`
run `ab -n 500000 -c 100 http://localhost:9200/metrics`

### Advanced

Generate some load on our application using Artillery in order to get some data into Prometheus.  For example, simulate 5 new users arriving to use the application every second for 600 seconds (resulting in 3000 users arriving in the space of 10 minutes). Each user will send 50 messages with a second’s pause in between and disconnect from the server.

run `artillery run test/websocket-test.yaml`

Generate both loads

run `artillery run test/websocket-test.yaml & ab -n 500000 -c 100 http://localhost:9200/metrics`

Note: All of the above can be run as scripts

run `npm run http-load`
run `npm run ws-load`
run `npm run load`

Hit extra endpoints for generating metrics
run `bash ./test/endpoints.sh`