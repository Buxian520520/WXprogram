Component({
  properties: {
    icon: {
      type: String,
      value: '📭'
    },
    title: {
      type: String,
      value: '暂无数据'
    },
    description: {
      type: String,
      value: ''
    },
    showButton: {
      type: Boolean,
      value: false
    },
    buttonText: {
      type: String,
      value: '刷新'
    }
  },

  methods: {
    onAction() {
      this.triggerEvent('action');
    }
  }
});
