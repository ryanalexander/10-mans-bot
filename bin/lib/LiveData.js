
const WebSocket = require("websocket").w3cwebsocket;
module.exports = class {
    constructor() {
        this.init();
    }

    async init() {
        this.conn = new WebSocket("wss://10s.oce.gg/live");
        this.conn.addEventListener('open',()=>{
            this.conn.addEventListener('message', (event)=>{
                let data = JSON.parse(event.data);
                switch (data['action']){
                    case "AUTHENTICATE":
                        this.conn.send(JSON.stringify({action:"AUTHENTICATE",key:"5cf8deb3-3358-4858-9bc6-ad42e029fd2b"}))
                        break;
                    default:
                        console.log(data);
                        break;
                }
            });
        });
        this.conn.addEventListener('close', ()=>{
            console.log('Reconnecting to websocket');
            setTimeout(()=>{this.init()}, 5000);
        });
        this.conn.addEventListener('error', (e)=>{
            switch(e.code){
                case 'ECONNREFUSED':
                    console.log('Reconnecting to websocket');
                    setTimeout(()=>{this.init()}, 5000);
                    break;
            }
        })
    }

    giveCasterGame(casterId, matchId) {
        if(casterId == null || matchId == null || casterId == "" || matchId == "")
            return;
        console.log("Broadcasted "+JSON.stringify({action:"ASSIGN_GAME",caster:casterId,game:matchId}));
        this.conn.send(JSON.stringify({action:"ASSIGN_GAME",caster:casterId,game:matchId}));
    }
}