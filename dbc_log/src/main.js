require("../config")
global.g_cmds = require("./cmds")

const DbcLogApp = require("./myapp")

global.g_App = new DbcLogApp()

g_App.lanuch()

process.on('uncaughtException', (err) => {
	console.log(err);
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
    if (cds[1] != null) args = cds[1].split("@")
  	g_cmds[cds[0]].call(null, args)
  }
  else{
  	console.log(`[${new Date().toLocaleString()}] ${input} is invalid cmd`);
  }
});

// let privateKey = `
// -----BEGIN RSA PRIVATE KEY-----
// MIICXQIBAAKBgQC97izirmkb7rFTZ3xvLr1dxeVMnbUTTujckW4YjnSLUQ+7gCHC
// c1mQJpr2k7gx9NHvfI503BvQb4s5ICfVY13wmk1aNdq/3/9RK7BaBs0afEZOAUHI
// geamm1b9STjqonRYDx83AOPUKwu8M8Ava9Z45BGm5ZLNOfcaR/d8jXpjTQIDAQAB
// AoGAP3Y31T5FrKmi4qVvdI7/gze+mE0R1fPF5v1I9jeTRYG+af40SY7VXE8p9D4D
// i92r0AOkbfOl7411zY6rAKgFGO4yNFq+YLpZcgRBEs09JCILYGCDIyGlAAUPE5fo
// Wmof/cZGoHCx5Yo4TSa1Lr82L4byNQE5AYpDy6CESBfzItkCQQDqlLEAmmgzMtKr
// A4diaU3MSQdWD9Q4FFNRuRQxZvIeQXNxeJMyq2EYqSJPuEjqfVG1d7cx60g9sowc
// veK4l6i3AkEAz0XIdR66Ae1vExkumLMvk2ZkhxmwVWrGNIOlWK4ZsEp2XuQrrmUU
// 0jSwHUmPncrM0vlJAEA2dOwVGQMdoNkoGwJBAIOlPIxVGwMYk4errE+7PxDVLwvK
// SFPMfFHRpxZuapQ2MP5OJ3V5Hj2DtaC9kBYgjDll3OZj3x/Y0q7Slaj4W5MCQEab
// WfbzuZ9wd3cFDAd+esV2iuYuzQ+76Lr44Xl9DUkthHc8uNiWnGojAp9ncKHq9K0l
// uEV6mlJoHaPAmPYzI2MCQQC5fe+ml73SgXqEnwF4gmoXqzju+3IglgQar9ogoiXO
// NotL4+yBt+eFRDTFPqvtaceDC0+bjY9TbRl/EChkk2KL
// -----END RSA PRIVATE KEY-----
// `

// let publicKey = `-----BEGIN PUBLIC KEY-----
// MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC97izirmkb7rFTZ3xvLr1dxeVM
// nbUTTujckW4YjnSLUQ+7gCHCc1mQJpr2k7gx9NHvfI503BvQb4s5ICfVY13wmk1a
// Ndq/3/9RK7BaBs0afEZOAUHIgeamm1b9STjqonRYDx83AOPUKwu8M8Ava9Z45BGm
// 5ZLNOfcaR/d8jXpjTQIDAQAB
// -----END PUBLIC KEY-----
// `

// const crypto = require('crypto');
// // const sign = crypto.createSign('RSA-SHA256');

// // sign.update('some data to sign');

// // let buf = sign.sign(privateKey)
// // console.log(buf);

// // const verify = crypto.createVerify('RSA-SHA256');

// // verify.update('some data to sign');


// // console.log(verify.verify(publicKey, buf));


// let data = "some data to sign"
// let sign = crypto.privateEncrypt(privateKey, Buffer.from(data)).toString("hex");

// console.log(sign)

// // let sign = "7616a6cdbd490d0c175963aac9ef95fd2d6dc7ba014a4c587fe5a46537690398c687e69d8cd805069eca30abc16fd5b3bd2200e604b40cc01da8d9d640076dd0d575f5cb165087b87a9b0cac7b48b9373ef026cac3b56f32657e2933e59d2523bb6dade0f131f9472d4f5482bb2a19a34266c47974201d50476468af62f69b1b";

// console.log(crypto.publicDecrypt(publicKey,Buffer.from(sign, "hex")).toString());