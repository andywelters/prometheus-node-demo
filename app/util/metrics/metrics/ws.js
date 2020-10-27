'use strict';

const promClient = require('prom-client'),
      cluster = require('cluster');

class WSMetrics {
  /**
   * @brief WSMetrics constructor.
   *
   * @param app The express app instance
   */
  constructor(app) {
    WSMetrics.instance = this;
    this.app = app; 

    // define a prometheus Gauge 'client_count'
    new promClient.Gauge({
      name: 'client_count',
      help: 'number of clients',
      labelNames: [
        'protocol',
        'worker'
      ],
      aggregator: 'sum', // 'sum', 'first', 'min', 'max', 'average', 'omit'
      async collect() {
        // Invoked when the registry collects its metrics' values.
    
        //only update if we have the express app
        if(!WSMetrics.instance.app) return;

        //update the number of websocket clients size
        this.set(
            { protocol: 'ws' },
            WSMetrics.instance.app.wsServer.clients.size,
        );
        //update the number of websocket clients size (worker metrics)
        /*this.set(
          { protocol: 'ws', worker: cluster.worker.id },
          WSMetrics.instance.app.wsServer.clients.size,
        );*/
      }
    });
  }
};

module.exports = WSMetrics;