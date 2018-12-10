const redis = require('redis');

var __host = 'localhost';
var __port = '6379';
var __retries = 24;
var __timeout = 128;

const configure = (host = 'localhost', port = '6379', retries = 24, timeout = 128) => {
    this.__host = host;
    this.__port = port;
    this.__retries = retries;
    this.__timeout = timeout;
};
/**
 * Polls the status of an operation with certain ID
 * Cache acts like a map with the following structure:
 * cache[correlationId][operation] = valueObject
 * 
 * @param {string} key A key with which the operation is associated.
 * @param {string} evaluate A function that tests the valueObject to check if the operation has finished yet.
 */
const pollValue = (correlationId, operation, evaluate) => {
    const key = `${correlationId}|${operation}`;
    if (key === null || key == undefined) {
        throw "redis-poll: key is undefined";
    }
    return new Promise((resolve, reject) => {
        try{
            poll(key, evaluate, resolve);
        }
        catch(e){
            reject(e);
        }
    });
};

const poll = (key, evaluate, callback, attemptsLeft = 0) => {
    var client = redis.createClient({
        host: this.__host,
        port: this.__port,
    });
    if (key === null || key == undefined) {
        client.quit();
        throw "redis: key is undefined";
    }
    setTimeout(() => {
        client.get(key, (err, result) => {
            const _o = JSON.parse(result);
            if (err) throw err;
            else if (evaluate(_o)) callback({ status: "completed", object: result });
            else if (attemptsLeft == 1) throw new Error('Exceeded maximum allowed attempts to poll data from the cache.');
            else poll(key, evaluate, callback, attemptsLeft ? attemptsLeft -1 : this.__retries - 1); // TODO : update and check retries before retrying
        });
        client.quit();
    }, this.__timeout);
};

/**
 * Cache acts like a map with the following structure:
 * cache[correlationId][operation] = valueObject
 * 
 * @param {string} correlationId The correlation id of the caller. The key of the cached value.
 * @param {string} operation  The operation request. The second level key of the cached value.
 * @param {object} valueObject The cached value associated with the the correlation id and the operation.
 */
const setValue = (correlationId, operation, valueObject)  => {
    return new Promise((resolve, reject) => {
        try{
            setRedisStatus(correlationId, operation, valueObject, resolve);
        }
        catch(e){
            reject(e);
        }
    });
};

const setRedisStatus = (correlationId, operation, valueObject, callback) => {
    var client = redis.createClient({
        host: this.__host,
        port: this.__port,
    });
    const key = `${correlationId}|${operation}`;
    client.get(key, (e, result) => {
        let object = null;
        if(e) { throw e; client.quit(); }
        else if (result === null){
            object = {};
            object[operation] = valueObject;
        }
        else{
            object = JSON.parse(result);
            object[operation] = valueObject;
        }
        client.set(key, JSON.stringify(object), (error, reply) => {
            callback({object, error, reply});

        });
        client.quit();
    });
};

module.exports = {
    pollValue,
    configure,
    setValue,
};
