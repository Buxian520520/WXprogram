/**
 * 自定义 TabBar
 * 根据用户角色显示不同的底部导航
 * - 学生端：签到 | 请假 | 我的
 * - 教师端：学生信息 | 数据中心 | 签到 | 我的
 */
const app = getApp();

Component({
  data: {
    selected: 0,
    list: []
  },

  lifetimes: {
    attached() {
      this.updateTabs();
    }
  },

  methods: {
    updateTabs() {
      const role = app.globalData.userRole || wx.getStorageSync('user_info')?.role || 'student';
      const allTabs = [
        { pagePath: '/pages/student-list/student-list', text: '学生信息', iconPath: '/images/tab/student.png', selectedIconPath: '/images/tab/student-active.png', role: 'teacher' },
        { pagePath: '/pages/charts/charts', text: '数据中心', iconPath: '/images/tab/chart.png', selectedIconPath: '/images/tab/chart-active.png', role: 'teacher' },
        { pagePath: '/pages/checkin/checkin', text: '签到', iconPath: '/images/tab/checkin.png', selectedIconPath: '/images/tab/checkin-active.png', role: 'all' },
        { pagePath: '/pages/leave-apply/leave-apply', text: '请假', iconPath: '/images/tab/chart.png', selectedIconPath: '/images/tab/chart-active.png', role: 'student' },
        { pagePath: '/pages/profile/profile', text: '我的', iconPath: '/images/tab/profile.png', selectedIconPath: '/images/tab/profile-active.png', role: 'all' }
      ];

      const list = allTabs
        .filter(tab => tab.role === 'all' || tab.role === role)
        .map(({ pagePath, text, iconPath, selectedIconPath }) => ({ pagePath, text, iconPath, selectedIconPath }));

      this.setData({ list }, () => this.syncSelected());
    },

    // 由页面 onShow 调用 getTabBar().syncSelected()
    syncSelected() {
      const pages = getCurrentPages();
      if (pages.length === 0) return;
      const currentPath = '/' + pages[pages.length - 1].route;
      const list = this.data.list;
      const idx = list.findIndex(item => item.pagePath === currentPath);
      if (idx > -1) {
        this.setData({ selected: idx });
      }
    },

    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      if (item && index !== this.data.selected) {
        wx.switchTab({ url: item.pagePath });
      }
    }
  }
});
