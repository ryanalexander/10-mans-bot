
const Discord = require("discord.js");
const fs = require("fs");

const client = new Discord.Client;
exports.discordClient = client;

exports.snowflake = new (require('./bin/lib/Snowflake'))(0);
exports.database = new (require('./bin/lib/Database'))();
exports.config = JSON.parse(fs.readFileSync("./config.json").toString('utf-8'));
exports.integration = new (require('./bin/lib/LiveData'))();
exports.queuemap = {};
exports.gamemap = [];

const commandManager = new (require('./bin/managers/CommandManager'))(Discord, client, exports.config);

client.on('ready', ()=>{
    console.log(`Client is ready`);
});

client.on('message', (message)=>{

    if(message.content.startsWith(exports.config.commandManager.prefix))
        commandManager.handle(message);
})

client.on('messageReactionAdd', (reaction, user)=>{
    if(user === client.user)return;
    if(exports.queuemap[reaction.message.guild.id] !== undefined && exports.queuemap[reaction.message.guild.id].message.id === reaction.message.id)
        exports.queuemap[reaction.message.guild.id].handleReaction(reaction, user);
});

client.ws.on('INTERACTION_CREATE', async interaction => {
    const command = interaction.data.name.toLowerCase();
    const args = interaction.data.options;

    console.log(interaction);
});

client.login(exports.config.token).then(r => {
    client.channels.fetch(exports.config.debugging.screaming_channel).then(channel => {
        channel.send(new Discord.MessageEmbed().setColor("GREEN").addField("Bot status","The bot has started."));
    })
});