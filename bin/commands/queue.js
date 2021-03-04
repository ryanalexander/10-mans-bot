
module.exports = class extends require('../lib/Command') {

    execute() {
        let guild = this.getGuild();
        let member = (this.getArg().mentions.members.first()!=null?this.getArg().mentions.members.first():{user:this.getSender()});
        if(this.getCommandManager().getApplication().queuemap[guild.id] !== undefined){
            this.getCommandManager().getApplication().queuemap[guild.id].removeFromQueue(member.user.id);
        }
    }
}