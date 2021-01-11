let messages = [];
let intractable = [];
let app = require("../../app");
const {MessageEmbed} = require('discord.js');

let modules = {
    GUILDMEMBER_SELECT:(message, playerList)=>{
        let emojies = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣', '8️⃣', '9️⃣', '🔟'];
        let fields = [];
        for(let i = 0; i < playerList.length; i++) {
            fields.push({
                name: `${emojies[i]}`,
                value: `<@${playerList[i]}>`,
                inline: true
            })
        }
        return {
            preactions: [
                {
                    action: "ADD_FIELDS",
                    args: fields
                }
            ],
            postactions: [
                {
                    action: "ADD_REACTIONS",
                    args: emojies.slice(0,playerList.length)
                }
            ]
        }
        ;
    },
    MAP_SELECT:(message, mapList)=>{
        let emojies = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣', '8️⃣', '9️⃣', '🔟'];
        let fields = [];
        for(let i = 0; i < mapList.length; i++) {
            fields.push({
                name: `${emojies[i]}`,
                value: `${mapList[i]}`,
                inline: true
            })
        }
        return {
            preactions: [
                {
                    action: "ADD_FIELDS",
                    args: fields
                }
            ],
            postactions: [
                {
                    action: "ADD_REACTIONS",
                    args: emojies.slice(0,mapList.length)
                }
            ]
        }
        ;
    }
}

module.exports = class {

    /**
     *
     * @param {Function} onreact Called whenever a reaction is sent on this message
     * @param {Object} message Discord RichEmbed
     */
    constructor(onreact, message, channel, oncancel) {
        this.onreact = onreact;
        this.oncancel = oncancel;
        this.message = message;
        this.active = message.defaultsActive;
        let Embed = new MessageEmbed({
            title: message.title[this.active?0:1],
            color: message.color,
            fields: {
                name: "Loading",
                value: "This message is still being loaded...",
                inline: false
            }
        });

        channel.send(Embed).then(msg => {
            this.discordMessage = msg;
            this.doRenderAction(message.fields);
        })
    }

    setActive(active) {
        this.active = active;
    }

    doRenderAction(playerList) {
        let message = this.message;

        let msg = this.discordMessage;
        let postActions = [];

        let discordEmbed = new MessageEmbed({
            title: this.active?message.title[0]:message.title[1],
            color: message.color
        });

        message.modules.forEach(module => {
            let moduleData = modules[module](message, playerList);
            moduleData.preactions.forEach(
                action => {
                    switch (action.action) {
                        case "ADD_FIELDS":
                            discordEmbed.addFields(action.args);
                            break;
                    }
                }
            )
            postActions.push(moduleData.postactions);
        })

        msg.edit(discordEmbed).then(null);

        if(messages.indexOf(msg.id) <= -1){
            messages.push(msg.id);
            intractable.push({
                message: msg.id,
                react: this.onreact,
                interact: this
            });
        }
        postActions.forEach(
            action => {
                switch(action[0].action) {
                    case "ADD_REACTIONS":
                        if(this.active)
                            action[0].args.forEach(reaction => msg.react(reaction));
                        break;
                }
            }
        )
    }

    cancel() {
        removeItemAll(messages, this.discordMessage.id);
        removeItemAll(intractable, this);
        this.discordMessage.delete();

        if(this.oncancel !== undefined)
            this.oncancel();
    }
}


app.discordClient.on('messageReactionAdd', (reaction, member)=>{
    if(messages.indexOf(reaction.message.id) > -1 && member.id !== app.discordClient.user.id) {
        let interact = (intractable.find(instance => instance.message === reaction.message.id));
        if(interact.interact.active === true)
            interact.react(reaction);
    }
});
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