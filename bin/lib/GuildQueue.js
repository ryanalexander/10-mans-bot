let app = require("../../app");
const MessageButton = require('./discord-buttons/src/Classes/MessageButton');

module.exports = class {

    snowflake = app.snowflake.generateSnowflake('GAME');
    priority = [];

    constructor(guild, commandManager) {
        this.commandManager = commandManager;
        this.config = commandManager.getConfig()['guilds'][guild.id];

        this.queueMembers = [];
        this.nonCaptains = [];
        this.queueMembersCached = [];
        this.nonCaptainsCached = [];

        this.cancelled = false;

        this.sendQueueMessage();

        setInterval(()=>{
            if(this.cancelled) {
                clearInterval(this)
                return
            }
            if(!arraysEqual(this.queueMembers,this.queueMembersCached) || !arraysEqual(this.nonCaptains,this.nonCaptainsCached)){
                // Something changed
                this.embed.spliceFields(0,1,[
                    {
                        name: "Players",
                        value: formatQueue(this.queueMembers, this.nonCaptains)
                    }
                ]);
                this.message.edit(this.embed);
                this.queueMembersCached = [...this.queueMembers];
                this.nonCaptainsCached = [...this.nonCaptains];
            }
            this.priority.forEach(priorityPlayer => {
                if(priorityPlayer.expires > (new Date()).getTime())
                    this.priority = removeItemAll(this.priority, priorityPlayer);
            })
        }, 250);
    }

    getQueueMembers() {
        return this.queueMembers;
    }
    getNonCaptains() {
        return this.nonCaptains;
    }
    isNonCaptain(userId) {
        return this.nonCaptains.indexOf(userId)-1;
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

    handleButton(id, user, button) {
        switch (id.toUpperCase()) {
            case "QUEUE.JOIN":
                app.database.getPlayerOrCreate(user.id);
                this.nonCaptains = removeItemAll(this.nonCaptains, user.id);
                if(this.queueMembers.indexOf(user.id) <= -1) {
                    if(this.priority.find(priorityPlayer => priorityPlayer.player === user.id)){
                        this.queueMembers.unshift(user.id)
                    }else {
                        this.queueMembers.push(user.id);
                    }
                }
                button.defer();
                break;
            case "QUEUE.LEAVE":
                if(this.queueMembers.indexOf(user.id) > -1)
                    this.queueMembers = removeItemAll(this.queueMembers, user.id);
                this.nonCaptains = removeItemAll(this.nonCaptains, user.id);
                button.defer();
                break;
            case "QUEUE.CAPTAIN.TOGGLE":
                if(this.queueMembers.indexOf(user.id) <= -1)
                    this.queueMembers.push(user.id);
                if(this.nonCaptains.indexOf(user.id) <=-1) {
                    this.nonCaptains.push(user.id);
                }else {
                    this.nonCaptains = removeItemAll(this.nonCaptains, user.id);
                }
                button.defer();
                break;
        }
    }

    handleReaction(reaction, user) {
        switch(reaction.emoji.id){
            case "847357628380086292":
                app.database.getPlayerOrCreate(user.id);
                this.nonCaptains = removeItemAll(this.nonCaptains, user.id);
                if(this.queueMembers.indexOf(user.id) <= -1) {
                    if(this.priority.find(priorityPlayer => priorityPlayer.player === user.id)){
                        this.queueMembers.unshift(user.id)
                    }else {
                        this.queueMembers.push(user.id);
                    }
                }
                break;
            case "847357628313370634":
                if(this.queueMembers.indexOf(user.id) > -1)
                    this.queueMembers = removeItemAll(this.queueMembers, user.id);
                this.nonCaptains = removeItemAll(this.nonCaptains, user.id);
                break;
            case "847145517984776192":
                if(this.queueMembers.indexOf(user.id) <= -1)
                    this.queueMembers.push(user.id);
                if(this.nonCaptains.indexOf(user.id) <=-1) {
                    this.nonCaptains.push(user.id);
                }else {
                    this.nonCaptains = removeItemAll(this.nonCaptains, user.id);
                }
                break;
        }
        reaction.users.remove(user);
        reaction.message.react(reaction.emoji);
    }

    sendQueueMessage() {
        var Discord = this.commandManager.getDiscord();

        this.embed = new Discord.MessageEmbed();

        this.embed.setTitle("Waiting List");
        this.embed.setColor(app.config.personalization.colors.inform_basic);

        this.embed.setFooter("You will receive a dm when you find a match")

        this.commandManager.getClient().channels.fetch(this.config.queueChannel).then(channel => {
            let join_button = new MessageButton()
                .setStyle('green')
                .setLabel('Join queue')
                .setID('QUEUE.JOIN')
            let leave_button = new MessageButton()
                .setStyle('red')
                .setLabel('Leave queue')
                .setID('QUEUE.LEAVE')
            let captain_button = new MessageButton()
                .setStyle('blurple')
                .setLabel("Toggle captain priority")
                .setID('QUEUE.CAPTAIN.TOGGLE')
            let site_button = new MessageButton()
                .setStyle('url')
                .setLabel("View online")
                .setURL("https://events.oce.gg/queues/"+channel.guild.id);
            join_button.emoji = { name: 'plus', id: '847357628380086292' }
            leave_button.emoji = { name: 'minus', id: '847357628313370634' }
            captain_button.emoji = { name: 'no_captain', id: '847145517984776192' }
            channel.send({embed: this.embed, buttons: [join_button, leave_button, captain_button]}).then(async message => {
                this.message = message;
                this.embed.addField("Players","*No players in queue*");
                this.message.edit(this.embed);
                /*
                message.react(await app.discordClient.emojis.resolve("847357628380086292")); // Plus
                message.react(await app.discordClient.emojis.resolve("847357628313370634")); // Minus
                message.react(await app.discordClient.emojis.resolve("847145517984776192")); // No-captain

                 */
            });
        });
    }

    cancel() {
        this.cancelled = true;
        this.message.delete();
    }
}

function formatQueue(arr, nonCaptains) {
    let result = "";

    for(var i = 0; i<arr.length&&i<20; i++)
        result += `${i===10?"**!  |** __**Next game**__\n":""}**${arr.indexOf(arr[i])+1} |** <@${arr[i]}> ${nonCaptains.indexOf(arr[i])>-1?"<:no_captain:847145517984776192>":""}\n`;
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