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
      themeChannel: "travel-theme-channel",
      profileChannel: "user-profiles-channel", // 用户资料频道
      isEditing: false,
      editForm: {
        name: "",
        pronouns: "",
        bio: "",
      },
      editingProfile: null,
      showAddThemeDialog: false,
      newTheme: '',
      themeColorCounter: 1, // 用于循环分配颜色
    };
  },

  methods: {

    // =============== Message ===============
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

    async sendMessage(session) {
      if (!this.myMessage) return;

      this.sending = true;

      await this.$graffiti.put(
        {
          value: {
            content: this.myMessage,
            published: Date.now(),
            themes: this.activeMessageThemes, // 可以是空数组
          },
          channels: [this.mainChannel],
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

        // 创建新消息
        await this.$graffiti.put(
          {
            value: {
              content: newContent,
              published: this.editingMessage.value.published,  // 保持原有的发布时间
              themes: this.editingMessage.value.themes, // 保持原有主题
            },
            channels: [this.mainChannel]  // 保持在相同的频道
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

    // =============== Theme ===============
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

    // 生成主题颜色
    generateThemeColor(theme) {
      // 使用字符串生成哈希值
      let hash = 0;
      for (let i = 0; i < theme.length; i++) {
        hash = theme.charCodeAt(i) + ((hash << 5) - hash);
      }

      // 生成 HSL 颜色
      // 使用 HSL 可以确保颜色饱和度和亮度一致，只改变色相
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 70%, 45%)`; // 固定饱和度和亮度
    },

    // 应用主题颜色
    applyThemeColor(theme) {
      const color = this.generateThemeColor(theme);
      const style = document.createElement('style');
      style.textContent = `
        .theme-toggle[data-theme="${theme}"].active {
          --theme-color: ${color};
          --theme-bg-color: ${color}15;
        }
      `;
      document.head.appendChild(style);
    },

    // 获取主题的颜色编号
    getThemeColor(theme) {
      const index = this.messageThemes.indexOf(theme);
      if (index === -1) return "1";
      return ((index % 6) + 1).toString(); // 修改为6种颜色循环
    },

    // 修改 addNewTheme 方法
    async addNewTheme() {
      if (this.newTheme.trim()) {
        const trimmedTheme = this.newTheme.trim().toLowerCase();

        // 检查是否已存在（使用小写比较）
        if (!this.messageThemes.map(t => t.toLowerCase()).includes(trimmedTheme)) {
            const newTheme = this.newTheme.trim(); // 保持原始大小写存储

            // 只上传新添加的主题，确保格式正确
            await this.$graffiti.put({
                value: {
                    theme: newTheme,
                    published: Date.now()
                },
                channels: [this.themeChannel]
            }, this.$graffitiSession.value);

            this.messageThemes.push(newTheme);
        }
        else {
          alert(`Theme "${trimmedTheme}" already exists`);
        }

        this.newTheme = '';
        this.showAddThemeDialog = false;
      }
    },

    // 修改主题按钮的渲染
    mounted() {
      // 为默认主题生成颜色
      this.messageThemes.forEach(theme => {
        this.applyThemeColor(theme);
      });
    },

    // 获取主题列表
    async fetchThemes() {
      try {
        // 使用 discover 方法获取主题
        const themeStream = this.$graffiti.discover(
          [this.themeChannel],
          {
            type: "object",
            properties: {
              value: {
                type: "object",
                required: ["theme", "published"],
                properties: {
                  theme: { type: "string" },
                  published: { type: "number" }
                }
              }
            }
          }
        );

        console.log("themeStream:", themeStream);

        // 合并默认主题和获取到的单个主题
        const defaultThemes = ["Attraction", "Food", "Stay", "Leisure"];
        const fetchedThemes = [];

        // 处理流式数据
        try {
          for await (const themeObj of themeStream) {
            if (themeObj && themeObj.object.value) {
              console.log("Theme object value:", themeObj.object.value);
              if (themeObj.object.value.theme) {
                console.log("Found theme:", themeObj.object.value.theme);
                fetchedThemes.push(themeObj.object.value.theme);
              }
            }
          }
        } catch (streamError) {
          console.error("Error processing theme stream:", streamError);
        }

        console.log("fetchedThemes:", fetchedThemes);

        // 合并并去重
        this.messageThemes = [...new Set([
            ...defaultThemes,
            ...fetchedThemes
        ])];

        console.log("Updated themes:", this.messageThemes);
      } catch (error) {
          console.error('Failed to fetch themes:', error);
          console.log("Current themes:", this.messageThemes);
      }
    },

    // =============== Profile ===============
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

    // 删除指定主题
    async deleteTheme(themeName) {
      try {
        const themeStream = await this.$graffiti.discover(
          [this.themeChannel],
          {
            type: "object",
            properties: {
              value: {
                type: "object",
                required: ["theme", "published"],
                properties: {
                  theme: { type: "string" },
                  published: { type: "number" }
                }
              }
            }
          }
        );

        for await (const themeObj of themeStream) {
          if (themeObj.object.value.theme === themeName) {
            console.log('Found theme to delete:', themeObj);
            await this.$graffiti.delete(themeObj.object.url, this.$graffitiSession.value);
            console.log('Theme deleted successfully');

            // 从本地列表中也删除该主题
            const index = this.messageThemes.indexOf(themeName);
            if (index > -1) {
              this.messageThemes.splice(index, 1);
            }

            break;
          }
        }
      } catch (error) {
        console.error('Failed to delete theme:', error);
      }
    },

  },

  // created() {
  //   console.log("Prior to fetchThemes, Themes:", this.messageThemes);
  //   this.fetchThemes();
  // },


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
    // 确保 themeChannel 已经设置
    if (vm.themeChannel) {
      console.log("Prior to fetchThemes, Themes:", vm.messageThemes);  // 打印当前主题列表
      await vm.fetchThemes();
    } else {
      console.error("Theme channel not initialized");
    }
  } else {
    console.log("User logged out");
    vm.userProfile = null;
    vm.showProfileWizard = false;
  }
}, { immediate: true });
