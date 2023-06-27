const process = require('./src/process.js');
const EventEmitter = require('events');
const fs = require('fs');

class Emitter extends EventEmitter {};

let emitter = new Emitter();
let options = {};

module.exports = (cwd) => ({
    name: "spwn-plus",
    version: "1.0",
    description: "A superset of SPWN that brings extra features",
    flags: {
        bundle: {
            short: "-b",
            description: "Option to bundle all modules in SPWN+ file",
            init: () => {
                options.bundle = {
                    value: true,
                    contents: cwd
                };
            }
        },
        input: {
            short: "-i",
            description: "SPWN+ file to convert to normal SPWN",
            required: true,
            amount_of_args: 1,
            init: async (filename) => {
                let file = fs.readFileSync(filename).toString();
                let res = await process(file, options);
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
});
