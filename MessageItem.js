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
  emits: ['edit', 'delete'],
  template: `
    <div class="message-item" :class="{ 'my-message': isMyMessage }">
      <div class="message-header">
        <strong>{{ displayName }}</strong>
        <div class="message-themes">
          <span
            v-for="(theme, index) in themes"
            :key="index"
            class="message-theme"
            :class="theme.toLowerCase()"
          >
            {{ theme }}
          </span>
        </div>
        <div class="message-actions" v-if="canEdit">
          <button @click="$emit('edit')" class="action-btn">Edit</button>
          <button @click="$emit('delete')" class="action-btn delete">Delete</button>
        </div>
      </div>
      <div class="message-content">
        {{ content }}
      </div>
      <div class="message-time">
        {{ new Date(time).toLocaleString() }}
      </div>
    </div>
  `
}
