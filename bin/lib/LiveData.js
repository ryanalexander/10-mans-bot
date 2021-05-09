
const WebSocket = require("websocket").w3cwebsocket;
const app = require("../../app.js");

module.exports = class {
    constructor() {
        this.init();
    }

    async init() {
        this.conn = new WebSocket("wss://ext-ocegg.stelch.net/live");
        this.conn.addEventListener('open',()=>{
            this.conn.addEventListener('message', (event)=>{
                let data = JSON.parse(event.data);
                switch (data['action']){
                    case "AUTHENTICATE":
                        this.conn.send(JSON.stringify({action:"AUTHENTICATE",key:app.config.tokens.stelch,position:"bot"}))
                        break;
                    case "GAME_FINISH":
                        var game = app.gamemap.find(game => game.snowflake === data.snowflake);
                        if(game) {
                            game.channels['main'].send(`This match has finished. These channels will be deleted in 60 seconds.`);
                            setTimeout(()=>{
                                game.cancel(true);
                            },60000);
                        }
                        break;
                    default:
                        console.log(data);
                        break;
                }
            });
        });
        this.conn.addEventListener('close', ()=>{
            console.log('Reconnecting to websocket [DISCONNECTED]');
            setTimeout(()=>{this.init()}, 5000);
        });
        this.conn.addEventListener('error', (e)=>{
            switch(e.code){
                case 'ECONNREFUSED':
                    console.log('Reconnecting to websocket [REFUSED]');
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