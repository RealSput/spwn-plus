const process = require('./src/process.js');
const EventEmitter = require('events');
const fs = require('fs');

let emitter = new class extends EventEmitter {};

module.exports = {
    name: "spwn-plus",
    version: "1.0",
    description: "A superset of SPWN that brings extra features",
    flags: {
        input: {
            short: "-i",
            description: "SPWN+ file to convert to normal SPWN",
            required: true,
            amount_of_args: 1,
            init: async (filename) => {
                let file = fs.readFileSync(filename).toString();
                let res = await process(file);
                emitter.emit('output', res);
            },
        },
        output: {
            short: "-o",
            description: "Output file of transpiled SPWN+ file",
            required: true,
            amount_of_args: 1,
            init: (filename) => {
                emitter.on('output', (output) => {
                    console.log('OUT:', output, filename)
                    fs.writeFileSync(filename, output);
                });
            }
        }
    },
};
