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
      selectedThemes: [], // 默认不选择任何特定主题，显示所有消息
      activeMessageThemes: ["Attraction"], // 默认选择景点主题发送消息
      editingMessage: null, // 当前正在编辑的消息
      editContent: "", // 编辑框的内容
      // 聊天频道设置
      mainChannel: "travel-chat-channel", // 主聊天频道
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

      // 准备发送到的频道，始终包含主频道
      const channels = [this.mainChannel];

      // 添加选中的主题频道
      this.activeMessageThemes.forEach(theme => {
        channels.push(this.themeChannels[theme]);
      });

      await this.$graffiti.put(
        {
          value: {
            content: this.myMessage,
            published: Date.now(),
            themes: this.activeMessageThemes, // 记录消息的主题，用于显示
          },
          channels: channels, // 发送到选中的主题频道
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
        // 如果主题已经在数组中，移除它
        this.selectedThemes.splice(index, 1);
      }
    },

    // 清除所有筛选器
    clearThemeFilters() {
      this.selectedThemes = [];
    },

    // 切换发送消息的主题
    toggleActiveTheme(theme) {
      const index = this.activeMessageThemes.indexOf(theme);
      if (index === -1) {
        // 如果主题不在数组中，添加它
        this.activeMessageThemes.push(theme);
      } else {
        // 如果主题已经在数组中且不是唯一一个，移除它
        if (this.activeMessageThemes.length > 1) {
          this.activeMessageThemes.splice(index, 1);
        }
      }
    },

    // 是否主题在活跃发送列表中
    isThemeActive(theme) {
      return this.activeMessageThemes.includes(theme);
    },

    // 是否主题被选中用于筛选
    isThemeSelected(theme) {
      return this.selectedThemes.includes(theme);
    },

    // 获取用于筛选的频道
    getFilterChannels() {
      if (this.selectedThemes.length === 0) {
        // 如果没有选择任何特定主题，使用主频道
        return [this.mainChannel];
      }

      // 返回选中的主题频道
      return this.selectedThemes.map(theme => this.themeChannels[theme]);
    }
  },

  computed: {
    // 获取当前筛选的channel
    filterChannels() {
      return this.getFilterChannels();
    },

    // 获取当前选中主题的显示文本
    selectedThemesDisplay() {
      if (this.selectedThemes.length === 0) {
        return "All Themes";
      }
      return this.selectedThemes.join(", ");
    },

    // 获取当前活跃发送主题的显示文本
    activeThemesDisplay() {
      return this.activeMessageThemes.join(", ");
    }
  }
})
  .use(GraffitiPlugin, {
    graffiti: new GraffitiLocal(),
    // graffiti: new GraffitiRemote(),
  })
  .mount("#app");
