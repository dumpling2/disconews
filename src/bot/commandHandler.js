const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * コマンドハンドラーを初期化
 * @param {Client} client - Discordクライアント
 * @returns {Collection} コマンドコレクション
 */
function initializeCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ コマンド "${command.data.name}" を読み込みました`);
    } else {
      console.log(`⚠️ コマンド "${file}" にdataまたはexecuteプロパティがありません`);
    }
  }

  return client.commands;
}

/**
 * スラッシュコマンドをDiscordに登録
 * @param {Client} client - Discordクライアント
 */
async function registerSlashCommands(client) {
  const commands = [];

  for (const command of client.commands.values()) {
    commands.push(command.data.toJSON());
  }

  try {
    console.log(`🔄 ${commands.length}個のスラッシュコマンドを登録中...`);

    await client.application.commands.set(commands);

    console.log('✅ スラッシュコマンドの登録が完了しました');
  } catch (error) {
    console.error('❌ スラッシュコマンドの登録エラー:', error);
  }
}

/**
 * インタラクションハンドラー
 * @param {Interaction} interaction - Discord インタラクション
 * @param {Object} config - 設定オブジェクト
 */
async function handleInteraction(interaction, config) {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ コマンド "${interaction.commandName}" が見つかりません`);
    return;
  }

  try {
    console.log(`🎯 コマンド実行: ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction, config);
  } catch (error) {
    console.error(`❌ コマンド実行エラー (${interaction.commandName}):`, error);

    const errorMessage = 'コマンドの実行中にエラーが発生しました。';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

module.exports = {
  initializeCommands,
  registerSlashCommands,
  handleInteraction,
};
