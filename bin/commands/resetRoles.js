module.exports = class extends require('../lib/Command') {

    async execute() {
        if(!this.getSender().hasPermission("ADMINISTRATOR"))
            return;
        for(let member in (await await (await this.getGuild()).roles.fetch(this.getMentions('ROLES'))[0]).members)
            await member.roles.remove(this.getMentions('ROLES')[0])
    }
}