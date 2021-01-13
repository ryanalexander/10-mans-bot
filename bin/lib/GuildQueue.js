let app = require("../../app");

module.exports = class {

    snowflake = app.snowflake.generateSnowflake('GAME');
    priority = [];

    constructor(guild, commandManager) {
        this.commandManager = commandManager;
        this.config = commandManager.getConfig()['guilds'][guild.id];

        this.queueMembers = [];
        this.queueMembersCached = [];

        this.cancelled = false;

        this.sendQueueMessage();

        setInterval(()=>{
            if(this.cancelled) {
                clearInterval(this)
                return
            }
            if(!arraysEqual(this.queueMembers,this.queueMembersCached)){
                // Something changed
                this.embed.spliceFields(0,1,[
                    {
                        name: "Players",
                        value: formatQueue(this.queueMembers)
                    }
                ]);
                this.message.edit(this.embed);
                this.queueMembersCached = [...this.queueMembers];
            }
            this.priority.forEach(priorityPlayer => {
                if(priorityPlayer.expires > (new Date()).getTime())
                    this.priority = removeItemAll(this.priority, priorityPlayer);
            })
        }, 1000);
    }

    getQueueMembers() {
        return this.queueMembers;
    }

    addToQueue(userId) {
        this.queueMembers.push(userId);
    }

    removeFromQueue(userId) {
        this.queueMembers = removeItemAll(this.queueMembers,userId)
    }

    removeAllFromQueue(users) {
        users.forEach(user => this.removeFromQueue(user));
    }

    handleReaction(reaction, user) {
        switch(reaction.emoji.name){
            case "✅":
                if(this.queueMembers.indexOf(user.id) <= -1) {
                    if(this.priority.find(priorityPlayer => priorityPlayer.player === user.id)){
                        this.queueMembers.unshift(user.id)
                    }else {
                        this.queueMembers.push(user.id);
                    }
                }
                break;
            case "⛔":
                if(this.queueMembers.indexOf(user.id) > -1)
                    this.queueMembers = removeItemAll(this.queueMembers, user.id);
                break;
        }
        reaction.users.remove(user);
    }

    sendQueueMessage() {
        var Discord = this.commandManager.getDiscord();

        this.embed = new Discord.MessageEmbed();

        this.embed.setTitle("10 Mans Waiting List");
        this.embed.setColor("RED");

        this.embed.setFooter("Bot by Aspy | "+this.snowflake)

        // TODO Actually put content in embed

        this.commandManager.getClient().channels.fetch(this.config.queueChannel).then(channel => {
            channel.send(this.embed).then(message => {
                this.message = message;
                this.embed.addField("Players","*No players in queue*");
                this.message.edit(this.embed);
                message.react('✅');
                message.react('⛔');
            });
        });
    }

    cancel() {
        this.cancelled = true;
        this.message.delete();
    }
}

function formatQueue(arr) {
    let result = "";

    for(var i = 0; i<arr.length&&i<20; i++)
        result += ((i === 9)?"**!  |** __**Next game**__\n":"")+"**"+(arr.indexOf(arr[i])+1)+" |** <@"+arr[i]+">\n"
    if(arr.length > 20)
        result += `*and ${arr.length - 20} more*`
    if(result === "")
        return "*No players in queue*";
    return result;
}
// Thx stackoverflow
function arraysEqual(_arr1, _arr2) {

    if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
        return false;

    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();

    for (var i = 0; i < arr1.length; i++) {

        if (arr1[i] !== arr2[i])
            return false;

    }

    return true;

}
function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}