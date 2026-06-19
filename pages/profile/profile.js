/**
 * 个人中心页逻辑
 * 角色感知的菜单枢纽，退出登录
 */

const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    userRole: '',
    displayName: '',
    avatarUrl: ''
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.syncSelected();
    this.setData({
      userRole: app.globalData.userRole || 'student',
      displayName: app.globalData.displayName || '用户'
    });
    this.loadAvatar();
  },

  // 加载用户头像
  loadAvatar() {
    const role = app.globalData.userRole || 'student';
    const cached = wx.getStorageSync('profile_avatar');
    if (cached) {
      this.setData({ avatarUrl: cached });
      return;
    }

    if (role === 'teacher') {
      api.get('teacher/info/').then(res => {
        if (res.code === 1 && res.data && res.data.avatarUrl) {
          const url = res.data.avatarUrl;
          wx.setStorageSync('profile_avatar', url);
          this.setData({ avatarUrl: url });
        }
      }).catch(() => {});
    } else {
      // 学生：通过学号查自己的头像
      const sno = app.globalData.username;
      if (!sno) return;
      api.post('students/query/', { inputstr: sno }).then(res => {
        if (res.code === 1 && res.data && res.data.length > 0) {
          const student = res.data[0];
          if (student.image) {
            const url = api.BASE_URL + 'media/' + student.image;
            wx.setStorageSync('profile_avatar', url);
            this.setData({ avatarUrl: url });
          }
        }
      }).catch(() => {});
    }
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    // 未开发功能：点击仅提示，不跳转
    const todoPages = ['class-manage', 'course-manage'];
    if (todoPages.some(p => url.indexOf(p) !== -1)) {
      wx.showToast({ title: '暂时未开发', icon: 'none', duration: 1500 });
      return;
    }

    wx.navigateTo({ url: url });
  },

  // AI 对话入口：启用悬浮 trigger
  enableAiDialog() {
    // 先设全局标记，确保跨页面实例也能读到
    app.globalData.aiDialogEnabled = true;

    const fp = this.selectComponent('#aiFloatingPanel');
    if (fp) {
      fp.enableTrigger();
      wx.showToast({ title: 'AI 对话已开启', icon: 'success', duration: 1200 });
    } else {
      // 组件尚未挂载：再次 onShow 时 pageLifetimes 会同步
      wx.showToast({ title: 'AI 对话已开启，请切换页面后查看', icon: 'success', duration: 1500 });
    }
  },

  // 浮动面板状态变化时，控制 tab-bar 显隐
  onFpStateChange(e) {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ tabBarHidden: e.detail.isOpen });
    }
  },

  handleLogout() {
    const that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#F53F3F',
      success(res) {
        if (res.confirm) {
          api.clearTokens();
          wx.removeStorageSync('profile_avatar');
          // 清空全局数据
          app.globalData.userRole = '';
          app.globalData.displayName = '';
          app.globalData.username = '';
          // 跳转到登录页
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});
