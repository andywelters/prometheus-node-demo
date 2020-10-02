'use strict';

const path = require("path"),
    cluster = require('cluster'),
    os = require('os'),
    cores = os.cpus(),
    promClient = require('prom-client'),
    AggregatorRegistry = promClient.AggregatorRegistry,
    aggregatorRegistry = new AggregatorRegistry(),
    messageTypes = require('./util/message-types');

// Receive message from the worker process
const onWorkerMsg = function(msg) {
    if(msg.type) {
        switch(msg.type) {
            case messageTypes.GET_CLUSTER_METRICS : getClusterMetrics(this.process); break;
        }
    } 
};

const getClusterMetrics = async (worker) => {
    console.log('Master ' + process.pid + ' received message from worker ' + worker.pid + '.', messageTypes.GET_CLUSTER_METRICS);
    // Do work in the master process and send message to worker process from the master process.
    worker.send({type:messageTypes.POST_CLUSTER_METRICS, data: await aggregatorRegistry.clusterMetrics()});
};

/*
 * Start Server
*/

cluster.setupMaster({
    exec : path.join(__dirname, "worker.js"),
});

if (cluster.isMaster) {
    console.log("Master : [ %d ][ Status : Setup ]", process.pid);

    for (var i = cores.length - 1; i >= 0; i--) {

        cluster.fork().on('message', onWorkerMsg);
    };

    cluster.on("fork", function(worker) {

        console.log("Worker : [ %d ][ Status : Forking ]", worker.process.pid);
    });

    cluster.on("online", function(worker) {

        console.log("Worker : [ %d ][ Status : Online ]", worker.process.pid);
    });

    cluster.on("listening", function(worker, address) {

        console.log("Worker : [ %d ][ Status : Listening ][ Address : %s ][ Port : %d ]", worker.process.pid, address.address, address.port);
    });

    cluster.on("disconnect", function(worker) {

        console.log("Worker : [ %d ][ Status : Disconnected ]", worker.process.pid);
    });


    /*
     * Restart Dead Workers
    */

    cluster.on("exit", function(worker, code, signal) {

        console.log("Worker : [ %d ][ Status : Exit ][ Signal : %s ][ Code : %s ]", worker.process.pid, signal, code);

        cluster.fork().on('message', onWorkerMsg);
    });

} else {

};