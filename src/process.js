const { wat_to_spwn } = require("./generate_spwn");
const path = require('path');
const fs = require('fs');

async function wasm2wat(file) {
  return new Promise((resolve) => {
    require("wabt")().then((wabt) => {
      var wasm = new Uint8Array(fs.readFileSync(file));

      var myModule = wabt.readWasm(wasm, { readDebugNames: true });
      myModule.applyNames();

      var wast = myModule.toText({ foldExprs: false, inlineExport: false });

      resolve(wast);
    });
  });
}

function trim(input) {
  const trimPattern = /(^\s*)(.*?)(\s*$)/;
  const [, leftPadding, content, rightPadding] = input.match(trimPattern);
  return { leftPadding, content, rightPadding };u
}

function wat_process(inp) {
  let first_res = inp
    .split("\n")
    .map((x) => {
      if (!/^[^a-zA-Z0-9\s]+$/.test(x)) {
        let full_res = trim(x);
        let trimmed = full_res.content;
        if (!trimmed.startsWith("(") && !trimmed.startsWith(")")) {
          return (
            full_res.leftPadding + "(" + trimmed + ")" + full_res.rightPadding
          );
        } else {
          return full_res.leftPadding + trimmed + full_res.rightPadding;
        }
      } else {
        return x;
      }
    })
    .join("\n");

  let second_res = first_res.split("\n").map(x => {
    let trimmed = trim(x);
    x = trimmed.content.split(' ');
    if (x[0] == "(data") {
      x = x.filter((e) => !/\$.+/.test(e));
    }
    return trimmed.leftPadding + x.join(' ') + trimmed.rightPadding;
  }).join('\n').replaceAll("()", "");

  return second_res;
}

function cr_regx(input) {
  // Escape special regex characters
  const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Match any character sequence that is not enclosed in quotes
  const regexPattern = `(?!(?:(?:[^"'\\\\]|\\\\.)*)['"])${escapedInput}`;
  
  return new RegExp(regexPattern, 'g');
}


async function replaceAsync(string, pattern, asyncReplacement) {
  const promises = [];

  string.replace(pattern, (match, ...args) => {
    const promise = asyncReplacement(match, ...args);
    promises.push(promise);
    return '';
  });

  const replacements = await Promise.all(promises);

  return string.replace(pattern, () => replacements.shift());
}

async function wasm(str) {
    return await replaceAsync(str, /(?<!["'])(?:&wasm\(["']([^"']+)["']\))(?!["'])/g, async function(match, filename) {
		let wat = await wasm2wat(filename);
		wat = wat_process(
			wat.replace(/\(\;(\d+)\;\)/g, (_, match) => `$${match}`)
		);
		let spwn = wat_to_spwn(wat);
        return '() { ' + spwn + ' }()';
    });
};

function unknown_args(str) {
    let times = 50;
	
    let args = " ".repeat(times).split(' ').map((_, i) => '__' + i.toString(16) + ' = null').join(', ');
    let a_arrayed = " ".repeat(times).split(' ').map((_, i) => '__' + i.toString(16)).join(', ');

    str = str.replace(cr_regx('&unknown'), args).replace(cr_regx('&[unknown]'), '[' + a_arrayed + ']');
    return str;
}

function non_l1_vars(str) {
  let result = '';
  let withinQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === "'" || char === '"') {
      withinQuotes = !withinQuotes;
      result += char;
    } else {
      if (withinQuotes) {
        result += char;
      } else {
        const charCode = char.charCodeAt(0);
        if (charCode <= 255) {
          result += char;
        } else {
          result += '_' + charCode.toString(16);
        }
      }
    }
  }

  return result;
}


function spread(str) {
    let array_track = {};

    str.split(/[\n;]/).filter(item => item !== '').forEach(x => {
        if (x.trim().startsWith('let')) {
            let regex = /(?<=\s|=)|(?=\s|=)/;
            let spl = x.trim().split(regex);
            let spl_filtered = spl.filter(x => x !== ' ' && x !== '=');
            let name = spl_filtered[1];
            let d = spl.indexOf("=");
            let rest = spl.slice(d + 1).filter(x => x !== ' ' && x !== '=');

            if (rest[0].startsWith('[') && rest[rest.length - 1].endsWith(']')) {
                array_track[name] = rest.length;
            }
        } else if (x.includes('...')) {
            str = str.replace(/\.\.\.([\w\d_]+)(?=\W|$)/g, (_, substr) => {
                return ' '.repeat(array_track[substr] - 1).split(' ').map((_, i) => {
                    return `arr[${i}]`
                }).join(', ');
            })
        }
    })

    return str;
};

async function bundle(input, cb, cwd) {
  const regex = /import\s+(['"])(.+?)\1/g;

  return await replaceAsync(input, regex, async (__, _, substring) => '(() { ' + await cb(path.join(cwd, substring)) + '})()');
}

async function process(code, settings) {
	if (settings.bundle) code = bundle(code, async (filename) => {
		if (filename.endsWith('spwnp')) {
			let file = fs.readFileSync(filename).toString();
			let r = await process(file, settings);
			return r;
		}
		else
			return fs.readFileSync(filename).toString();
	}, settings.bundle.contents);
	
	if (typeof code !== "string") code = await code;
	
    code = unknown_args(code);
    code = spread(code);
	code = await wasm(code);
	code = non_l1_vars(code);
    return code;
}

module.exports = process;
