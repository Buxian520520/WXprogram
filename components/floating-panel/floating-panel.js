/**
 * AI 对话窗口组件
 * 悬浮面板 + DeepSeek 聊天，API Key 已内置
 */
var ai = require('../../utils/ai');

// 生成唯一消息 ID
var _msgId = 0;
function nextId() {
  return 'm' + (++_msgId);
}

Component({
  properties: {
    title: {
      type: String,
      value: 'AI 助手'
    }
  },

  data: {
    // 面板
    isOpen: false,
    showTrigger: true,

    // 聊天
    messages: [],       // [{id, role, content, time}]
    inputValue: '',
    sending: false,
    scrollTop: 0        // 用 scroll-top 替代 scroll-into-view，更稳定
  },

  lifetimes: {
    attached: function () {
      this.setData({
        messages: [{
          id: nextId(),
          role: 'assistant',
          content: '你好！我是 AI 助手，有什么可以帮你的？',
          time: this._fmtTime()
        }]
      });
    }
  },

  methods: {

    // ========== 面板 ==========

    openPanel: function () {
      if (this.data.isOpen) return;
      this.setData({ isOpen: true, showTrigger: false });
      this._scrollBottom();
    },

    closePanel: function () {
      if (!this.data.isOpen) return;
      this.setData({ isOpen: false });
    },

    hidePanel: function () {
      this.closePanel();
    },

    onPanelTransitionEnd: function () {
      if (!this.data.isOpen) {
        setTimeout(function () {
          this.setData({ showTrigger: true });
        }.bind(this), 50);
      }
    },

    // ========== 输入 ==========

    onInputChange: function (e) {
      this.setData({ inputValue: e.detail.value });
    },

    // ========== 发送（合并 setData 防闪烁） ==========

    sendMessage: function () {
      var content = this.data.inputValue.trim();
      if (!content || this.data.sending) return;

      // 构建并一次性添加用户消息 + 清空输入 + 标记发送中
      var userMsg = { id: nextId(), role: 'user', content: content, time: this._fmtTime() };
      var messages = this.data.messages.concat(userMsg);

      this.setData({
        messages: messages,
        inputValue: '',
        sending: true
      });
      this._scrollBottom();

      var context = this._buildContext(messages);
      var that = this;

      ai.chat(context).then(function (reply) {
        // 一次性完成：关闭 sending + 添加 AI 回复，避免两次渲染闪烁
        var aiMsg = { id: nextId(), role: 'assistant', content: reply, time: that._fmtTime() };
        that.setData({
          messages: that.data.messages.concat(aiMsg),
          sending: false
        });
        that._scrollBottom();
      }).catch(function (err) {
        var errMsg = { id: nextId(), role: 'assistant', content: '抱歉，出错了：' + err.message, time: that._fmtTime() };
        that.setData({
          messages: that.data.messages.concat(errMsg),
          sending: false
        });
        that._scrollBottom();
      });
    },

    // ========== 清空对话 ==========

    clearChat: function () {
      var that = this;
      wx.showModal({
        title: '清空对话',
        content: '确定要清空所有对话记录吗？',
        success: function (res) {
          if (res.confirm) {
            that.setData({
              messages: [{
                id: nextId(),
                role: 'assistant',
                content: '对话已清空。有什么可以帮你的？',
                time: that._fmtTime()
              }]
            });
          }
        }
      });
    },

    // ========== 内部 ==========

    _buildContext: function (msgs) {
      var recent = msgs.slice(-20);
      return recent.map(function (m) {
        return { role: m.role, content: m.content };
      });
    },

    _scrollBottom: function () {
      // scroll-top 设一个极大值，自动滚到底
      var that = this;
      setTimeout(function () {
        that.setData({ scrollTop: 99999 });
      }, 80);
    },

    _fmtTime: function () {
      var d = new Date();
      return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    },

    stopPropagation: function () {}
  }
});
