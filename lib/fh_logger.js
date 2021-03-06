/*
 JBoss, Home of Professional Open Source
 Copyright Red Hat, Inc., and individual contributors.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
var bunyan = require('bunyan');
var cluster = require('cluster');

module.exports.createLogger = function(loggerConfig) {
  if (!loggerConfig) {
    throw Error('config instance must be specified');
  }
  var config = parseConfig(loggerConfig);
  config.streams = createStreams(config);
  config.serializers = createSerializers(config);
  return bunyan.createLogger(config);
}

function parseConfig(loggerConfig) {
  return typeof loggerConfig === 'string' ? JSON.parse(loggerConfig) : loggerConfig;
}

function createStreams(config) {
  if (!config.streams) {
    return null;
  }
  var streams = config.streams.map(function(stream) {
    switch (stream.type) {
      case 'raw':
        stream.stream = new bunyan.RingBuffer({
          limit: config.ringBufferLimit || 200
        });
        break;
      case 'stream':
        switch (stream.stream) {
          case 'process.stdout':
            stream.stream = process.stdout;
            break;
          case 'process.stderr':
            stream.stream = process.stderr;
            break;
          default:
            stream.stream = eval(stream.stream);
        }
        break;
      case 'file':
        stream.stream = stream.file;
        break;
    }
    return stream;
  });
  return streams;
}

function createSerializers(config) {
  var serializers = {};
  serializers.req = requestSerializer;
  serializers.res = bunyan.stdSerializers.res;
  if (config.hasOwnProperty('serializers')) {
    if (config.serializers.req) {
      serializers.req = config.serializers.req;
    }
    if (config.serializers.res) {
      serializers.res = config.serializers.res;
    }
  }
  return serializers;
}

var requestSerializer = function(req) {
  if (req) {
    return {
      reqId: req.id,
      method: req.method,
      url: req.url,
      worker: cluster.worker? cluster.worker.id: -1
    }
  }
  return {}
}
