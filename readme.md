

run `node index.js`

install prometheus

run `./prometheus --config.file=prometheus.yml`

The node program will present an endpoint for metrics on a port.
Can view them at http://localhost:9200/metrics

Prometheus will scrape that endpoint

Can see prometheus data at http://localhost:9090/


