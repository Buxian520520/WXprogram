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
    list: [],
    role: 'student',
    tabBarHidden: false
  },

  lifetimes: {
    attached() {
      this.updateTabs();
    }
  },

  methods: {
    updateTabs() {
      const role = app.globalData.userRole || wx.getStorageSync('user_info')?.role || 'student';
      this.setData({ role });
      const allTabs = [
        { pagePath: '/pages/student-list/student-list', text: '学生信息', iconPath: '/icon/xueshengdangan.png', role: 'teacher' },
        { pagePath: '/pages/charts/charts', text: '数据中心', iconPath: '/icon/a-04StartupSet4.png', role: 'teacher' },
        { pagePath: '/pages/checkin/checkin', text: '签到', iconPath: '/icon/qiandao.png', role: 'all' },
        { pagePath: '/pages/leave-apply/leave-apply', text: '请假', iconPath: '/icon/qingjiajilu.png', role: 'student' },
        { pagePath: '/pages/profile/profile', text: '我的', iconPath: '/icon/guanyu.png', role: 'all' }
      ];

      const list = allTabs
        .filter(tab => tab.role === 'all' || tab.role === role)
        .map(({ pagePath, text, iconPath }) => ({ pagePath, text, iconPath }));

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
