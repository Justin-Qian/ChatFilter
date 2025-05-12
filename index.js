import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import MessageItem from "./MessageItem.js";

createApp({
  components: {
    MessageItem
  },
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
      // 用户资料
      userProfile: null,
      showProfileWizard: false,  // 控制向导显示
      showProfile: false,
      profileForm: {
        name: "",
        pronouns: "",
        bio: "",
      },
      // 聊天频道设置
      mainChannel: "travel-chat-channel",
      generalChannel: "travel-general-channel", // 无主题消息的频道
      profileChannel: "user-profiles-channel", // 用户资料频道
      themeChannels: {
        Attraction: "travel-attraction-channel",
        Food: "travel-food-channel",
        Stay: "travel-stay-channel",
        Leisure: "travel-leisure-channel"
      },
      isEditing: false,
      editForm: {
        name: "",
        pronouns: "",
        bio: "",
      },
      editingProfile: null,
    };
  },

  methods: {
    // 滚动到底部
    scrollToBottom() {
      // 根据当前活动面板选择对应的消息容器
      const activePanel = this.activePanel;
      const messagesContainer = document.querySelector(`.${activePanel === 'filter' ? 'topic-filter-panel' : 'all-messages-panel'} .messages`);

      if (messagesContainer) {
        // 使用 nextTick 确保在 DOM 更新后滚动
        this.$nextTick(() => {
          // 添加一个小延时，确保消息完全加载
          setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }, 100);
        });
      }
    },

    // 监听消息加载完成
    onMessagesLoaded() {
      this.scrollToBottom();
    },

    // 获取用户资料
    async fetchUserProfile(session) {
      try {
        const profiles = await this.$graffiti.get({
          channels: [session.actor],
          actor: session.actor
        });

        // 检查是否有资料
        if (profiles && profiles.length > 0) {
          // 已有资料，直接使用
          this.userProfile = profiles[0];
          this.profileForm = { ...this.userProfile.value };
          this.showProfileWizard = false;  // 确保向导不显示
          console.log("Found existing profile:", this.userProfile);
        } else {
          // 没有资料，显示向导
          console.log("No profile found, showing wizard");
          this.userProfile = null;
          this.profileForm = { name: "", pronouns: "", bio: "" };
          this.showProfileWizard = true;
        }
      } catch (error) {
        console.log("Error fetching profile:", error);
        // 出错时也显示向导
        this.userProfile = null;
        this.profileForm = { name: "", pronouns: "", bio: "" };
        this.showProfileWizard = true;
      }
    },

    // 保存用户资料（首次设置时使用）
    async saveProfile(session, existingProfiles) {
      if (!this.profileForm.name) {
        alert("Name is required!");
        return;
      }

      try {
        if (!session) {
          throw new Error("No active session found");
        }

        console.log("Current session:", session);
        console.log("Saving initial profile...", {
          profileForm: this.profileForm,
          existingProfiles
        });

        // 删除所有现有的profiles
        if (existingProfiles && existingProfiles.length > 0) {
          for (const profile of existingProfiles) {
            try {
              await this.$graffiti.delete(profile.url, session);
              console.log("Deleted old profile:", profile.url);
            } catch (deleteError) {
              console.warn("Failed to delete old profile:", deleteError);
              // 继续处理其他profiles
            }
          }
        }

        // 创建新的资料
        const newProfile = await this.$graffiti.put(
          {
            value: {
              name: this.profileForm.name.trim(),
              generator: "https://Justin-Qian.github.io/ChatFilter/",
              pronouns: (this.profileForm.pronouns || "").trim(),
              bio: (this.profileForm.bio || "").trim(),
              published: Date.now()
            },
            channels: ["designftw-2025-studio2", session.actor]
          },
          session
        );

        console.log("Profile saved:", newProfile);
        this.userProfile = newProfile;
        this.showProfileWizard = false;
      } catch (error) {
        console.error("Failed to save profile - Full error:", {
          error: error,
          message: error.message,
          stack: error.stack,
          session: session,
          profileForm: this.profileForm
        });
        alert(`Failed to save profile: ${error.message}`);
      }
    },

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

      // 等待DOM更新后再执行滚动和聚焦
      await this.$nextTick();
      this.scrollToBottom();
      this.$refs.messageInput.focus();
    },

    // 开始编辑消息
    startEdit(message) {
      this.editingMessage = message;
    },

    // 取消编辑
    cancelEdit() {
      this.editingMessage = null;
    },

    // 保存编辑后的消息
    async saveEdit(session, newContent) {
      if (!this.editingMessage || !newContent) return;

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
              content: newContent,
              published: this.editingMessage.value.published,  // 保持原有的发布时间
              themes: messageThemes, // 保持原有主题
            },
            channels: channels  // 保持在相同的频道
          },
          session
        );

        this.editingMessage = null;
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
      // 等待 DOM 更新后滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },

    // 清除所有选中的主题
    clearThemes() {
      if (this.selectedThemes.length > 0) {
        // 添加消失动画
        const themeButtons = document.querySelectorAll('.theme-toggle:not(.clear-btn)');
        themeButtons.forEach(button => {
          button.classList.add('disappear');
        });

        // 等待动画完成后清除主题
        setTimeout(() => {
          this.selectedThemes = [];
          this.activeMessageThemes = this.selectedThemes;
          // 移除动画类
          themeButtons.forEach(button => {
            button.classList.remove('disappear');
          });
        }, 500);
      }
    },

    // 切换发送消息的主题
    toggleActiveTheme(theme) {
      // 同步更新筛选主题和发送主题
      this.toggleThemeFilter(theme);
      this.activeMessageThemes = this.selectedThemes;
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
    },

    // 获取用户显示名称
    getUserDisplayName(actor) {
      if (actor === this.$graffitiSession.value?.actor) {
        return this.userProfile?.value.name || actor;
      }
      // TODO: 获取其他用户的资料显示（这需要额外的实现）
      return actor;
    },

    // 开始编辑资料
    startProfileEdit(profile) {
      this.editingProfile = profile;  // 保存当前正在编辑的profile对象
      this.editForm = {
        name: profile.value.name || "",
        pronouns: profile.value.pronouns || "",
        bio: profile.value.bio || ""
      };
      this.isEditing = true;
    },

    // 取消编辑
    cancelProfileEdit() {
      this.isEditing = false;
      this.editingProfile = null;
      this.editForm = {
        name: "",
        pronouns: "",
        bio: ""
      };
    },

    // 保存编辑的更改
    async saveProfileChanges(session, existingProfiles) {
      if (!this.editForm.name.trim()) {
        alert("Name is required!");
        return;
      }

      try {
        if (!session) {
          throw new Error("No active session found");
        }

        console.log("Current session:", session);
        console.log("Saving profile changes...", {
          editForm: this.editForm,
          existingProfiles
        });

        // 删除所有现有的profiles
        if (existingProfiles && existingProfiles.length > 0) {
          for (const profile of existingProfiles) {
            try {
              await this.$graffiti.delete(profile.url, session);
              console.log("Deleted old profile:", profile.url);
            } catch (deleteError) {
              console.warn("Failed to delete old profile:", deleteError);
              // 继续处理其他profiles
            }
          }
        }

        // 创建新的profile
        const newProfile = await this.$graffiti.put(
          {
            value: {
              name: this.editForm.name.trim(),
              pronouns: (this.editForm.pronouns || "").trim(),
              bio: (this.editForm.bio || "").trim(),
              published: Date.now()
            },
            channels: [session.actor]
          },
          session
        );

        console.log("Profile updated successfully:", newProfile);

        // 重置编辑状态
        this.isEditing = false;
        this.editingProfile = null;
        this.editForm = {
          name: "",
          pronouns: "",
          bio: ""
        };

      } catch (error) {
        console.error("Failed to update profile - Full error:", {
          error: error,
          message: error.message,
          stack: error.stack,
          session: session,
          editForm: this.editForm
        });
        alert(`Failed to update profile: ${error.message}`);
      }
    },
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
    // graffiti: new GraffitiLocal(),
    graffiti: new GraffitiRemote(),
  })
  .mount("#app");

// 监听登录状态变化
const app = document.querySelector("#app").__vue_app__;
const vm = app._instance.proxy;

// 当用户登录时获取资料
vm.$watch('$graffitiSession.value', async (newSession) => {
  if (newSession) {
    console.log("User logged in, fetching profile...");
    await vm.fetchUserProfile(newSession);
  } else {
    console.log("User logged out");
    vm.userProfile = null;
    vm.showProfileWizard = false;
  }
}, { immediate: true });
