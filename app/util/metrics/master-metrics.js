'use strict';

const promClient = require('prom-client'),
    aggregatorRegistry = new promClient.AggregatorRegistry(),
    messageTypes = require('./message-types');

const getClusterMetrics = async (worker) => {
    console.log('Master ' + process.pid + ' received message from worker ' + worker.pid + '.', messageTypes.GET_CLUSTER_METRICS);
    // Do work in the master process and send message to worker process from the master process.
    worker.send({type:messageTypes.POST_CLUSTER_METRICS, data: await aggregatorRegistry.clusterMetrics()});
};

var exp = module.exports;

// Receive message from the worker process
exp.onWorkerMsg = function(msg) {
    if(msg.type) {
        switch(msg.type) {
            case messageTypes.GET_CLUSTER_METRICS : getClusterMetrics(this.process); break;
        }
    } 
};