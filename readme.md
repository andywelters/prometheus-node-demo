
run `npm i`

run `node index.js`

install prometheus somehow

run `./prometheus --config.file=prometheus.yml`

The node program will present an endpoint for metrics on a port.
Can view them at http://localhost:9200/metrics

Prometheus will scrape that endpoint

Can see prometheus data at http://localhost:9090/


# grafana is optional

can install it but can also just run the binary with these steps

get it
wget https://dl.grafana.com/oss/release/grafana-7.1.5.linux-amd64.tar.gz

unzip it
tar -zxvf grafana-7.1.5.linux-amd64.tar.gz

run it
bin/grafana-server --config=conf/defaults.ini

can then dig around to discover the local prometheus endpoint or use the grafana-dashboard.json in this repo

