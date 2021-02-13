const app = require("../../app");
const GuildQueue = require("../lib/GuildQueue");
const Game = require("../lib/Game");

const {MessageEmbed} = require('discord.js');

module.exports = class extends require('../lib/Command') {
    execute() {

        if(this.getConfig().type !== "client") {
            this.getChannel().send("This is a management Discord. You may only execute `game` in a client Discord!");
            return;
        }
        if(!this.getSender().hasRoleByName("10 Mans Staff") && !this.getSender().hasPermission("DEV"))
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
            case "GENSF":
                this.getChannel().send(app.snowflake.generateSnowflake())
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
                this.createQueue();
                break;
            case "STOP":
            case "CLOSE":
            case "DESTROY":
            case "DELETE":
            case "TERMINATE":
            case "END":
                this.closeQueue();
                break;
            case "ADDPLAYER":
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
                game.setTeam(this.getArg().mentions.members.first().id, this.getArgs()[4]-1);
                this.getArg().reply(new MessageEmbed()
                        .setColor('BLURPLE')
                        .setTitle('Team set')
                        .setDescription(`<@${this.getArg().mentions.members.first().id}> has been assigned to ${game.teams[this.getArgs()[4]-1].name}`)
                    );
                break;
            case "SETNAME":
                this.getArg().reply(new MessageEmbed()
                    .setColor('BLURPLE')
                    .setTitle('Team name set')
                    .setDescription(`${game.teams[this.getArgs()[3]-1].name} has been renamed to ${this.getArgs()[4]}`)
                );
                game.setTeamName(this.getArgs()[3]-1, this.getArgs()[4]);
                break;
            case "STOP":
            case "CLOSE":
            case "CANCEL":
            case "DESTROY":
            case "DELETE":
            case "TERMINATE":
            case "END":
                game.cancel(game.gamestage > 2);
                break;
            case "REMPLAYER":
                game.removePlayer(this.getArg().mentions.members.first().id);
                break;
            case "ADDPLAYER":
                game.addPlayer(this.getArg().mentions.members.first().id);
                break;
            case "GETSUB":
                game.getSub(game.channels['staff']);
                break;
            case "PRINTV":
                game.printv(game.channels['staff']);
                break;
            case "SETCASTERS":
                game.setCasters(this.getArg().mentions.members)
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

        if(this.getCommandManager().getApplication().queuemap[guild.id] !== undefined)
            return;

        this.getCommandManager().getApplication().queuemap[guild.id] = new GuildQueue(guild, this.getCommandManager());
    }

    closeQueue() {
        let guild = this.getGuild();
        if(this.getCommandManager().getApplication().queuemap[guild.id] !== undefined){
            this.getCommandManager().getApplication().queuemap[guild.id].cancel();
            delete this.getCommandManager().getApplication().queuemap[guild.id];
        }
    }
}