# Design monitoring for the new API nodes
https://docs.google.com/document/d/1uVwz3A3B3vG2fgD-pGrM2dkkfzUIzZR4rD4qhQoWjSE/edit?usp=sharing

## node

run `npm i`

run `node index.js`

The node program will present an endpoint for metrics on a port. Can view them at http://localhost:9200/metrics

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