const mesg = require('mesg-js').service();

const IPFS = require('ipfs');
const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
};
const node = new IPFS(ipfsOptions);

const Readable = require('stream').Readable;

node.on('ready', () => {

  mesg.listenTask({

    stop: (inputs, { success }) => {
      node.stop(() => {
        console.log('IPFS node has been stopped.');
        success({ message: 'IPFS node has been stopped.' });
      });
    },

    add: ({ str }, { success, error }) => {
      console.log('Adding:', str);

      const s = new Readable();
      s.push(str);
      s.push(null);

      node.addFromStream(s, (err, res) => {
        console.log('...', str);
        if (err) {
          console.error(err);
          error({ error: err.toString() });
        } else {
          console.log(res);
          success({ result: res });
        }
      });
    },

    cat: ({ path }, { success, error }) => {
      console.log('Retrieving:', path);

      node.cat(path, (err, file) => {
        if (err) {
          console.error(err);
          error({ error: err.toString() });
        } else {
          console.log('Retrieved:', file);
          success({ file: file.toString('utf8') });
        }
      });
    },

    subscribe: ({ topic }, { success, error }) => {

      const cb = (err) => {
        if (err) {
          console.error(err);
          error({ error: err.toString() });
        }
        console.log(`Subscribed to topic: ${topic}`);
        success({
          message: `Subscribed to topic: ${topic}`,
          topic: topic
        });
      };

      const handler = (msg) => {
        console.log(`Received on topic ${topic} message: {msg}`);
        mesg.emitEvent(
          'messageReceived',
          { topic: topic,
            message: msg.data.toString() });
      };

      node.pubsub.subscribe(topic, handler, cb);
      console.log(`Requested subscribe to ${topic}`);
    },

    publish: ({ topic, message }, { success, error }) => {
      console.log(`Requested publish to ${topic}: ${message}`);
      node.pubsub.publish(
        topic, Buffer.from(message), (err) => {
          if (err) {
            console.error(err);
            error({ error: err.toString() });
          }
          console.log(`Published to ${topic}: ${message}`);
          success({
            // message: `Published to ${topic}: ${message}`,
            topic: topic,
            message: message
          });
        });
    }

  }).on('error', error => console.error(error));

  // Emit an event signalling that the service has started
  mesg.emitEvent('started', {})
    .catch((error) => console.error(error));

});

node.on('error', error => {
  console.error(error);
});

node.on('stop', () => {
  mesg.emitEvent('stopped', {})
    .catch(error => console.error(error));
});

