export default {
  name: 'MessageItem',
  props: {
    content: {
      type: String,
      required: true
    },
    themes: {
      type: Array,
      default: () => []
    },
    time: {
      type: Number,
      required: true
    },
    isMyMessage: {
      type: Boolean,
      default: false
    },
    displayName: {
      type: String,
      required: true
    },
    canEdit: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showActions: false,
      isEditing: false,
      editContent: ''
    };
  },
  mounted() {
    // 添加全局点击事件监听
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    // 移除全局点击事件监听
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    handleClickOutside(event) {
      // 如果点击的不是more-btn或action-menu，则关闭菜单
      const moreBtn = this.$el.querySelector('.more-btn');
      const actionMenu = this.$el.querySelector('.action-menu');

      if (this.showActions &&
          !moreBtn?.contains(event.target) &&
          !actionMenu?.contains(event.target)) {
        this.showActions = false;
      }
    },
    startEdit() {
      this.isEditing = true;
      this.editContent = this.content;
      this.showActions = false;
      this.$emit('edit', this);
    },
    cancelEdit() {
      this.isEditing = false;
      this.editContent = '';
      this.$emit('cancel');
    }
  },
  emits: ['edit', 'delete', 'save', 'cancel'],
  template: await fetch("./MessageItem.html").then((r) => r.text()),
}
