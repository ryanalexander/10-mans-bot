const Discord = require("discord.js");
const fs = require("fs");

const client = new Discord.Client({
    intents: Discord.Intents.ALL
});
const disbut = require('./bin/lib/discord-buttons/src/index')(client);
exports.discordClient = client;

exports.snowflake = new (require('./bin/lib/Snowflake'))(0);
exports.database = new (require('./bin/lib/Database'))();
exports.config = require("./config.json");
exports.integration = new (require('./bin/lib/LiveData'))();
exports.queuemap = {};
exports.gamemap = [];

exports.selfDistructiveChannelListener = {};

const commandManager = new (require('./bin/managers/CommandManager'))(Discord, client, exports.config);

client.on('ready', ()=>{
    console.log(`Client is ready`);
/*
TODO - Add slashcommand support
    client.guilds.forEach(guild => {
        if(exports.config.guilds[guild.id] !== undefined) {
            guild.commands.create({
                name:"game",
                description: "Manage game data",
                options: [
                    {
                        type:
                    }
                ],
                defaultPermission: false
            })
        }
    })
 */
});

client.on('message', (message)=>{

    if(message.author.id === client.user.id)
        return;

    if(exports.selfDistructiveChannelListener[message.channel.id] !== undefined) {
        exports.selfDistructiveChannelListener[message.channel.id](message);
        delete exports.selfDistructiveChannelListener[message.channel.id];
    }

    if(message.content.startsWith(exports.config.commandManager.prefix))
        commandManager.handle(message);
})

client.on('messageReactionAdd', (reaction, user)=>{
    if(user === client.user)return;
    if(exports.queuemap[reaction.message.guild.id] !== undefined && exports.queuemap[reaction.message.guild.id].message.id === reaction.message.id)
        exports.queuemap[reaction.message.guild.id].handleReaction(reaction, user);
});

client.on('clickButton', async (button) => {
    if(button.clicker.user === client.user)return;
    if(exports.queuemap[button.guild.id] !== undefined && exports.queuemap[button.guild.id].message.id === button.message.id) {
        exports.queuemap[button.guild.id].handleButton(button.id, button.clicker.user, button);
    }
});

client.login(exports.config.tokens.discord)