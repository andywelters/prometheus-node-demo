'use strict';

global.Promise = require('bluebird');

const path = require('path'),
    cluster = require('cluster'),
    os = require('os'),
    cores = os.cpus(),
    masterMetrics = require('./util/metrics/master-metrics');

/*
 * Start Server
*/

cluster.setupMaster({
    exec : path.join(__dirname, "advanced-worker.js"),
});

if (cluster.isMaster) {
    console.log("Master : [ %d ][ Status : Setup ]", process.pid);

    for (var i = cores.length - 1; i >= 0; i--) {

        cluster.fork().on('message', masterMetrics.onWorkerMsg);
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

        cluster.fork().on('message', masterMetrics.onWorkerMsg);
    });

} else {

};