const colors = require('@colors/colors/safe');
const process = require('./src/process.js');
const EventEmitter = require('events');
const cp = require('child_process');
const fs = require('fs');

class Emitter extends EventEmitter {};

let emitter = new Emitter();
let options = {};

let run = false;
let input = '';

module.exports = (main_process) => ({
    name: "spwn-plus",
    version: "1.0",
    description: "A superset of SPWN that brings extra features",
    flags: {
		bundle: {
			short: "-b",
			description: "Option to bundle all modules in SPWN+ file",
			init: () => {
				options.bundle = { value: true, contents: main_process.cwd() };
			}
		},
		run: {
			short: "-r",
			description: "Automatically run transpiled result",
			init: () => {
				run = true;
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
				
				input = filename;
				
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
					fs.writeFileSync(filename, output);
					if (!run) {
						console.log(colors.green('Successfully compiled', input, 'to SPWN!'));
					} else {
						cp.spawnSync(`spwn build ${filename} ${main_process.env.SPWN_RUN_FLAGS || ""}`, {shell: true, stdio: "inherit"})
					};
				});
            }
        }
    },
});
