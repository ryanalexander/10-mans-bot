
module.exports = class extends require('../../lib/Command') {

    execute() {
        if(this.getSender().hasPermission("DEV")){
            process.exit(0);
        }else {
            this.getChannel().send(new (this.getCommandManager().discord).MessageEmbed().addField("Hey!","You cannot do that.").setColor("RED").setFooter(this.getSender().getSnowflake()+" attempted to stop bot"));
        }
    }
}