
const Discord = require("discord.js");
const fs = require("fs");

const client = new Discord.Client;

exports.discordClient = client;
exports.config = JSON.parse(fs.readFileSync("./config.json"));
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

client.login(exports.config.token).then(r => {
    client.channels.fetch("767660775425703977").then(channel => {
        channel.send(new Discord.MessageEmbed().setColor("GREEN").setDescription("10 Mans Bot is now running"));
    })
});