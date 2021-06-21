const app = require("../../../app");
const Command = require('../../lib/Command');
const { MessageButton } = require('discord-buttons');
const { MessageEmbed } = require("discord.js")
const fetch = require('node-fetch');

module.exports = class extends Command {

    async execute() {
        let join_button = new MessageButton()
            .setStyle('green') //default: blurple
            .setLabel('Join queue') //default: NO_LABEL_PROVIDED
            .setID('queue_join') //note: if you use the style "url" you must provide url using .setURL('https://example.com')
        let leave_button = new MessageButton()
            .setStyle('red') //default: blurple
            .setLabel('Leave queue') //default: NO_LABEL_PROVIDED
            .setID('queue_leave') //note: if you use the style "url" you must provide url using .setURL('https://example.com')
        join_button.emoji = { name: 'plus', id: '847357628380086292' }
        leave_button.emoji = { name: 'minus', id: '847357628313370634' }

        await this.getChannel().send('testing', {
            buttons: [join_button, leave_button]
        });
    }
}