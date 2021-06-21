const app = require("../../app");
const Command = require('../lib/Command');
const MessageInteractable = require('../lib/MessageInteractable');

module.exports = class extends Command {

    async execute() {
        if(!this.getSender().hasRoleByName("Event Staff") && !this.getSender().hasPermission("DEV"))
            return;
        if(this.getConfig().type !== "client") {
            this.getChannel().send(`This is a management Discord. You may only execute '${this.cmd}' in a client Discord!`);
            return;
        }
        new MessageInteractable(async (reaction) => {
            console.log(reaction);
        }, {
            title: ["End of night"],
            color: '00a8ff',
            fields: ["Start end of night", "Cancel"],
            modules: ['CONFIRMDENY']
        }, this.getChannel(), ()=>{
            // Do the stuff
        })
    }
}