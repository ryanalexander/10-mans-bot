const app = require("../../app");
const Command = require('../lib/Command');
const GuildQueue = require("../lib/GuildQueue");
const Game = require("../lib/Game");

const zlip = require("zlib");

module.exports = class extends Command {


    static actions = {
        OPEN_QUEUE: (instance, embed)=>{
            let guild = instance.getGuild();

            if(instance.getCommandManager().getApplication().queuemap[guild.id] !== undefined) {
                embed.setColor(app.config.personalization.colors.inform_error);
                embed.setDescription("A queue is already open!")
                return;
            }

            let queue = new GuildQueue(guild, instance.getCommandManager());
            instance.getCommandManager().getApplication().queuemap[guild.id] = queue;
            embed.setDescription(`Queue has been opened. \n[View Channel](https://discord.com/channels/${guild.id}/${queue.config.queueChannel})`)
        },
        CLOSE_QUEUE: (instance, embed)=>{
            let guild = instance.getGuild();
            if(instance.getCommandManager().getApplication().queuemap[guild.id] !== undefined){
                instance.getCommandManager().getApplication().queuemap[guild.id].cancel();
                delete instance.getCommandManager().getApplication().queuemap[guild.id];
                embed.setDescription("Queue has been closed");
            }else {
                embed.setDescription("No queue to close!");
            }
        },
        ADD_QUEUE_PLAYER: (instance, embed)=>{
            let guild = instance.getGuild();
            let first = instance.getArg().content.toLowerCase().indexOf("-p")>-1;

            let target = null;

            if(instance.getMentions('MEMBERS').first() !== undefined) {
                target = instance.getMentions('MEMBERS').first().user.id;
            }else if(instance.getArgs()[1] !== undefined && !isNaN(instance.getArgs()[1])) {
                target = instance.getArgs()[1];
            }

            if(!target) {
                embed.setDescription("You must include a member to tag");
                return;
            }

            if(instance.getCommandManager().getApplication().queuemap[guild.id] !== undefined){
                if(first) {
                    embed.setDescription(`Added <@${target}> to top of queue`);
                    embed.addField("Priority", "yes")
                    instance.getCommandManager().getApplication().queuemap[guild.id].queueMembers.unshift(target);
                }else {
                    embed.setDescription(`Added <@${target}> to the queue`);
                    embed.addField("Priority", "no")
                    instance.getCommandManager().getApplication().queuemap[guild.id].queueMembers.push(target);
                }
            }
        },
        ADD_TEST_PLAYERS: (instance, embed)=>{
            let guild = instance.getGuild();
            let ids = ["317236321099710467","650161495354638347","718337884029190145","822088580335271956","421652646294716427","431056428036259851"];
            instance.getCommandManager().getApplication().queuemap[guild.id].queueMembers.push(...ids);
            embed.setDescription(`Added ${ids.length} test account to queue`);
            embed.setColor(app.config.personalization.colors.inform_dev);
        },
        REMOVE_QUEUE_PLAYER: (instance, embed) => {
            let guild = instance.getGuild();
            let target = null;

            if(instance.getMentions('MEMBERS').first() !== undefined) {
                target = instance.getMentions('MEMBERS').first().user.id;
            }else if(instance.getArgs()[1] !== undefined && !isNaN(instance.getArgs()[1])) {
                target = instance.getArgs()[1];
            }

            if(!target) {
                embed.setDescription("You must include a member to tag");
                return;
            }
            if(instance.getCommandManager().getApplication().queuemap[guild.id] !== undefined){
                embed.setDescription(`Removed <@${target}> from the queue`);
                instance.getCommandManager().getApplication().queuemap[guild.id].removeFromQueue(target);
            }else {
                embed.setColor(app.config.personalization.colors.inform_error);
                embed.setDescription("Failed to find open queue.")
            }
        }
    };

    async execute() {
        let embed = new (this.getCommandManager().discord).MessageEmbed();

        if(this.getConfig().type !== "client") {
            this.getChannel().send("This is a management Discord. You may only execute `game` in a client Discord!");
            return;
        }
        if(!this.getSender().hasRoleById(this.getConfig().supportRole) && !this.getSender().hasPermission("DEV"))
            return;

        embed.setColor(app.config.personalization.colors.inform_basic);
        embed.setTitle("Queue Management");

        if(this.getArgs().length > 1) {
            switch (this.getArgs()[1].toUpperCase()) {
                case "OPEN":
                    module.exports.actions.OPEN_QUEUE(this, embed);
                    break;
                case "CLOSE":
                    module.exports.actions.CLOSE_QUEUE(this, embed);
                    break;
                case "ADDPLAYER":
                    module.exports.actions.ADD_QUEUE_PLAYER(this, embed);
                    break;
                case "REMPLAYER":
                    module.exports.actions.REMOVE_QUEUE_PLAYER(this, embed);
                    break;
                case "ADDTEST":
                    module.exports.actions.ADD_TEST_PLAYERS(this, embed);
                    break;
                default:
                    embed.setColor(app.config.personalization.colors.inform_error);
                    embed.setDescription("Unknown argument. Try `.help queue`")
                    break;
            }
        }else {
            embed.setColor(app.config.personalization.colors.inform_error);
            embed.setDescription("Unknown argument. Try `.help queue`")
        }

        if(this.getCommandManager().getApplication().queuemap[this.getGuild().id])
            embed.setThumbnail("https://cdn.discordapp.com/attachments/767649316281516054/838366634124247051/transperant.png?"+zlip.deflateSync(JSON.stringify({
                queuePlayers:this.getCommandManager().getApplication().queuemap[this.getGuild().id].queueMembers,
                priority:this.getCommandManager().getApplication().queuemap[this.getGuild().id].priority
            })).toString('base64'))
        this.getChannel().send(embed);
    }
}