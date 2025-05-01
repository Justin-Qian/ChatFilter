import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

createApp({
  data() {
    return {
      myMessage: "",
      sending: false,
      messageThemes: ["Attraction", "Food", "Stay", "Leisure"],
      selectedThemes: [], // 用于Topic Filter的主题筛选
      activeMessageThemes: [], // 用于发送消息时的主题标记
      editingMessage: null,
      editContent: "",
      activePanel: 'all',
      // 聊天频道设置
      mainChannel: "travel-chat-channel",
      generalChannel: "travel-general-channel", // 无主题消息的频道
      themeChannels: {
        Attraction: "travel-attraction-channel",
        Food: "travel-food-channel",
        Stay: "travel-stay-channel",
        Leisure: "travel-leisure-channel"
      }
    };
  },

  methods: {
    async sendMessage(session) {
      if (!this.myMessage) return;

      this.sending = true;

      // 准备发送到的频道
      let channels = [this.mainChannel];

      // 如果有选中的主题，添加主题频道
      if (this.activeMessageThemes.length > 0) {
        this.activeMessageThemes.forEach(theme => {
          channels.push(this.themeChannels[theme]);
        });
      } else {
        // 如果没有选中主题，添加general频道
        channels.push(this.generalChannel);
      }

      await this.$graffiti.put(
        {
          value: {
            content: this.myMessage,
            published: Date.now(),
            themes: this.activeMessageThemes, // 可以是空数组
          },
          channels: channels,
        },
        session,
      );

      this.sending = false;
      this.myMessage = "";
      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

    // 开始编辑消息
    startEdit(message) {
      this.editingMessage = message;
      this.editContent = message.value.content;
    },

    // 取消编辑
    cancelEdit() {
      this.editingMessage = null;
      this.editContent = "";
    },

    // 保存编辑后的消息
    async saveEdit(session) {
      if (!this.editingMessage || !this.editContent) return;

      try {
        // 先删除原来的消息
        await this.$graffiti.delete(this.editingMessage.url, session);

        // 准备发送到的频道，始终包含主频道
        const channels = [this.mainChannel];

        // 添加原消息的主题频道
        const messageThemes = this.editingMessage.value.themes || ["Attraction"];
        messageThemes.forEach(theme => {
          channels.push(this.themeChannels[theme]);
        });

        // 创建新消息
        await this.$graffiti.put(
          {
            value: {
              content: this.editContent,
              published: this.editingMessage.value.published,  // 保持原有的发布时间
              themes: messageThemes, // 保持原有主题
            },
            channels: channels  // 保持在相同的频道
          },
          session
        );

        this.editingMessage = null;
        this.editContent = "";
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    },

    // 删除消息
    async deleteMessage(message, session) {
      if (!message) return;

      try {
        await this.$graffiti.delete(message.url, session);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    },

    // 切换主题筛选器
    toggleThemeFilter(theme) {
      const index = this.selectedThemes.indexOf(theme);
      if (index === -1) {
        // 如果主题不在数组中，添加它
        this.selectedThemes.push(theme);
      } else {
        // 可以移除主题，允许没有主题被选中
        this.selectedThemes.splice(index, 1);
      }
    },

    // 清除所有选中的主题
    clearThemes() {
      if (this.selectedThemes.length > 0) {
        this.selectedThemes = [];
      }
    },

    // 切换发送消息的主题
    toggleActiveTheme(theme) {
      // 同步更新筛选主题和发送主题
      this.toggleThemeFilter(theme);
      this.activeMessageThemes = [...this.selectedThemes];
    },

    // 是否主题在活跃发送列表中
    isThemeActive(theme) {
      return this.selectedThemes.includes(theme);
    },

    // 是否主题被选中用于筛选
    isThemeSelected(theme) {
      return this.selectedThemes.includes(theme);
    },

    // 获取用于筛选的频道
    getFilterChannels() {
      if (this.activePanel === 'filter') {
        // Topic Filter面板：如果没有选择主题，返回空数组（不显示任何消息）
        if (this.selectedThemes.length === 0) {
          return [];
        }
        // 返回选中的主题频道
        return this.selectedThemes.map(theme => this.themeChannels[theme]);
      } else {
        // All Messages面板：显示所有消息
        return [this.mainChannel];
      }
    }
  },

  computed: {
    // 获取当前筛选的channel
    filterChannels() {
      return this.getFilterChannels();
    },

    // 获取当前选中主题的显示文本
    selectedThemesDisplay() {
      if (this.activePanel === 'filter') {
        return this.selectedThemes.length === 0 ? "No Theme Selected" : this.selectedThemes.join(", ");
      } else {
        return this.selectedThemes.length === 0 ? "All Themes" : this.selectedThemes.join(", ");
      }
    },

    // 获取当前活跃发送主题的显示文本
    activeThemesDisplay() {
      return this.selectedThemes.length === 0 ? "No Theme" : this.selectedThemes.join(", ");
    }
  }
})
  .use(GraffitiPlugin, {
    graffiti: new GraffitiLocal(),
    // graffiti: new GraffitiRemote(),
  })
  .mount("#app");
