class UploadCfgEvent{
	constructor(){
		this.callbacks = []
	}

	push(client, key, cfgs){
		for(let i = 0; i < this.callbacks.length; i++){
			this.callbacks[i](client, key, cfgs)
		}
	}

	register(cb){
		this.callbacks.push(cb)
	}
}

module.exports = UploadCfgEvent;