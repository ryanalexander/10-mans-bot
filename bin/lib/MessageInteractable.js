let messages = [];
let intractable = [];
let app = require("../../app");
const {MessageEmbed} = require('discord.js');
const MessageButton = require('./discord-buttons/src/Classes/MessageButton');

let modules = {
    GUILDMEMBER_SELECT:async (message, playerList)=>{
        let emojies = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣', '8️⃣', '9️⃣', '🔟'];
        let fields = [];
        let buttons = [];
        let list = "";
        for(let i = 0; i < playerList.length; i++) {
            let player = await app.discordClient.users.fetch(playerList[i]);
            list += `${player}\n`
            buttons.push(new MessageButton()
                .setStyle('blurple')
                .setLabel(player.username)
                .setID(`SEL-${playerList[i]}`))
        }
        return {
            preactions: [
                {
                    action: "ADD_FIELDS",
                    args: fields
                },
                {
                    action: "ADD_BUTTONS",
                    args: buttons
                }
            ],
            postactions: []
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
    },
    OPTION_SELECT:(message, options)=>{
        let emojies = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣', '8️⃣', '9️⃣', '🔟'];
        let fields = [];
        for(let i = 0; i < options.length; i++) {
            fields.push({
                name: `${emojies[i]}`,
                value: `${options[i]}`,
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
                    args: emojies.slice(0,options.length)
                }
            ]
        }
            ;
    },
    CONFIRMDENY:(message, options)=>{
        let emojies = ['✅','❎'];
        let fields = [];
        for(let i = 0; i < options.length; i++) {
            fields.push({
                name: `${emojies[i]}`,
                value: `${options[i]}`,
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
                    args: emojies.slice(0,options.length)
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
    constructor(onreact, message, channel, oncancel, onbutton) {
        this.onreact = onreact;
        this.onbutton = onbutton;
        this.oncancel = oncancel;
        this.message = message;
        this.active = message.defaultsActive;
        let messageEmbed = new MessageEmbed({
            title: message.title[this.active?0:1],
            color: message.color,
            fields: {
                name: "Loading",
                value: "This message is still being loaded...",
                inline: false
            }
        });

        if(message.description !== undefined) {
            messageEmbed.description = message.description;
            messageEmbed.fields = []
        }

        channel.send({embed: messageEmbed, buttons: []}).then(msg => {
            this.discordMessage = msg;
            if(messages.indexOf(msg.id) <= -1){
                messages.push(msg.id);
                intractable.push({
                    message: msg.id,

                    button: this.onbutton,
                    react: this.onreact,
                    interact: this
                });
            }
            if(message.fields !== undefined)
                this.doRenderAction(message.fields);
        })
    }

    setActive(active) {
        this.active = active;
    }

    async doRenderAction(playerList) {
        let message = this.message;

        let msg = this.discordMessage;
        let postActions = [];
        let buttons = [];

        message.active = this.active;

        let discordEmbed = new MessageEmbed({
            title: this.active?message.title[0]:message.title[1],
            color: message.color
        });

        for(let i = 0; i < message.modules.length; i++) {
            let module = message.modules[i];
            let moduleData = await modules[module](message, playerList);
            moduleData.preactions.forEach(
                action => {
                    switch (action.action) {
                        case "ADD_FIELDS":
                            discordEmbed.addFields(action.args);
                            break;
                        case "ADD_BUTTONS":
                            buttons = action.args;
                            break;
                    }
                }
            )
            postActions.push(moduleData.postactions);
        }
        if(!this.active)
            buttons.forEach(button => button.setDisabled(true));
        msg.edit({embed: discordEmbed, buttons: buttons})

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

app.discordClient.on('clickButton', async (button) => {
    if(button.clicker.user === app.discordClient.user)return;
    if(messages.indexOf(button.message.id) > -1) {
        let interact = (intractable.find(instance => instance.message === button.message.id));
        if(interact.interact.active === true)
            interact.button(button);
    }
});
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