require("../config")

const DbcPlayerApp = require("./myapp")

global.g_App = new DbcPlayerApp()

g_App.lanuch()

process.on('uncaughtException', (err) => {
	console.log(err)
  g_App.log_sys_error.error(err)
});


const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  let cds = input.split("@")
  if(g_cmds[cds[0]] != null){
    let args = null
    if (cds[1] != null) args = cds[1].split("|")
  	g_cmds[cds[0]].call(null, args)
  }
  else{
  	console.log(`[${new Date().toLocaleString()}] ${input} is invalid cmd`);
  }
});

