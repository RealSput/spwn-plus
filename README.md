# spwn-plus
A superset of SPWN that brings extra features

# Usage
### Commands to run this example
#### To automatically run this:
```
spwn-plus -bi main.spwnp -r -o output.spwn
```
##### Note: you can set flags & arguments with the `SPWN_RUN_FLAGS` environment variable. Example: `set SPWN_RUN_FLAGS="-l"`

#### To compile directly to SPWN:
```
spwn-plus -bi main.spwnp -o output.spwn
```


#### main.spwnp:
```rs
// You can now use characters outside Latin1 range in variable names with SPWN+!
let 你好 = import "imported.spwnp"; // if we use the "-b" flag, we can bundle this so the user only has to download a single .spwn file instead of multiple files

let add_two_numbers = (a, b) {
	$.print(a + b);
}

let test = (&unknown) { // we can use `&unknown` to say that we don't know the amount of arguments
	let args = &[unknown]; // we can then use `&[unknown]` to define the array that stores the arguments
	
	let arr = [args[0], args[1]];
	other_func(...arr); // we use ... to spread the array, so instead of having the array as a single argument, we can use the values as parameters
	
	let exports = 你好.instantiate().exports; // instantiates the WASM module
	exports.main(); // runs main function
}

test(1, 2);
```
#### imported.spwnp:
```rs
return &wasm("hello_world.wasm"); // returns WASM module
```
