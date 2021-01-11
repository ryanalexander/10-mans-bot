
const GuildQueue = require("../lib/GuildQueue");
const Game = require("../lib/Game");

module.exports = class extends require('../lib/Command') {
    execute() {

        if(!this.getSender().hasRoleByName("10 Mans Staff"))
            return;

        switch(this.getArgs().length>1?this.getArgs()[1].toUpperCase():""){
            case "QUEUE":
                this.queueManager();
                break;
            case "THIS":
                let game = this.getCommandManager().getApplication().gamemap.find(game => game.category === this.getChannel().parent.id);
                if(game === null || game === undefined) {
                    this.getChannel().send("You aren't in a game channel!");
                }else {
                    this.thisGame(this.getArgs(),game);
                }
                break;
            case "START":
                this.createGame();
                break;
            case "PRINTDB":
                this.debug.printdb();
                break;
            case "YELLATASPY":
                this.debug.yellataspy();
                break;
            default:
                this.helpMenu("DEFAULT");
                break;
        }
    }

    queueManager() {
        switch(this.getArgs().length>2?this.getArgs()[2].toUpperCase():""){
            case "OPEN":
            case "START":
            case "CREATE":
            case "INITIATE":
            case "INSERT":
            case "BEGIN":
                // TODO Create queue
                this.createQueue();
                break;
            case "STOP":
            case "CLOSE":
            case "DESTROY":
            case "DELETE":
            case "TERMINATE":
            case "END":
                // TODO Remove queue
                this.closeQueue();
                break;
            default:
                this.helpMenu("QUEUE");
                break;
        }
    }


    helpMenu(menu) {
        switch(menu) {
            case "DEFAULT":
                this.getChannel().send(new (this.getCommandManager().discord).MessageEmbed().setTitle("Game Help Menu").addFields([
                    {
                        name: "queue",
                        value: "All queue related functions"
                    },
                    {
                        name: "start",
                        value: "Start a game (queue must be open)"
                    }
                ]).setColor("BLURPLE"));
                break;
            case "QUEUE":
                this.getChannel().send(new (this.getCommandManager().discord).MessageEmbed().setTitle("Queue Help Menu").addFields([
                    {
                        name: "start",
                        value: "Open queue for players to join"
                    },
                    {
                        name: "stop",
                        value: "Close queue and prevent new players joining"
                    }
                ]).setColor("BLURPLE"));
                break;
        }
    }

    thisGame(args, game) {
        switch(this.getArgs().length>2?this.getArgs()[2].toUpperCase():""){
            case "SETTEAM":
                game.setTeam(this.getArg().mentions.members.first(), this.getArgs()[4]);
                break;
            case "STOP":
            case "CLOSE":
            case "CANCEL":
            case "DESTROY":
            case "DELETE":
            case "TERMINATE":
            case "END":
                game.cancel();
                break;
            case "REMPLAYER":
                break;
            case "ADDPLAYER":
                break;
            case "GETSUB":
                break;
            case "PRINTV":
                game.printv(game.channels['staff']);
                break;
            default:
                this.getChannel().send("Unknown arguments");
                break;
        }
    }

    createGame() {
        let players = [];
        if(this.getCommandManager().getApplication().queuemap[this.getGuild().id] === undefined){
            // No queue
            this.getChannel().send("No open queue");
            return;
        }
        let queue = this.getCommandManager().getApplication().queuemap[this.getGuild().id];

        if(queue.getQueueMembers().length < 10 && this.getArg().content.indexOf("-f") <= -1) {
            this.getChannel().send(`Not enough players! (${queue.getQueueMembers().length} / 10)`);
            return;
        }
        if(queue.getQueueMembers().length < 4) {
            this.getChannel().send(`Not enough players! (${queue.getQueueMembers().length} / 4)\nA match cannot have less than 4 players (2v2)`);
            return;
        }

        for(let i = 0; i < queue.getQueueMembers().length && i <= 9; i++)
            players.push(queue.getQueueMembers()[i]);
        queue.removeAllFromQueue(players);
        this.getChannel().send(`Created game ${(new Game(this.getGuild(), players)).getId()}`)
    }

    createQueue() {
        let guild = this.getGuild();

        this.getCommandManager().getApplication().queuemap[guild.id] = new GuildQueue(guild, this.getCommandManager());
    }

    closeQueue() {
        let guild = this.getGuild();
        this.getCommandManager().getApplication().queuemap[guild.id].cancel();
        delete this.getCommandManager().getApplication().queuemap[guild.id];
    }
}