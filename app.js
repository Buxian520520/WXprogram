/**
 * 小程序入口文件
 * 负责全局状态管理、登录态检查和生命周期处理
 */

const api = require('./utils/api');

App({
  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 检查登录态
   * 如果有有效 Token → 进入主界面
   * 如果有过期 Token 但 RefreshToken 有效 → 尝试刷新
   * 如果没有 Token → 跳转登录页
   */
  checkLoginStatus() {
    const tokenData = wx.getStorageSync('token_data');
    const userInfo = wx.getStorageSync('user_info');

    if (tokenData && tokenData.accessToken) {
      // 解析 JWT 获取用户信息
      const decoded = api.decodeJWT(tokenData.accessToken);
      if (decoded) {
        this.globalData.userRole = decoded.role || userInfo?.role || 'student';
        this.globalData.displayName = decoded.display_name || userInfo?.displayName || decoded.username || '';
        this.globalData.username = decoded.username || userInfo?.username || '';
      } else if (userInfo) {
        this.globalData.userRole = userInfo.role || 'student';
        this.globalData.displayName = userInfo.displayName || '';
        this.globalData.username = userInfo.username || '';
      }

      // 检查 Token 是否过期
      if (tokenData.expireTime > Date.now()) {
        // Token 有效
        console.log('Token 有效，用户角色:', this.globalData.userRole);
      } else if (tokenData.refreshToken) {
        // Token 过期，尝试刷新
        console.log('Token 已过期，尝试刷新...');
        this.tryRefreshToken(tokenData.refreshToken);
      }
    } else {
      // 没有存储的 Token，需要登录
      console.log('未检测到登录信息');
    }
  },

  /**
   * 尝试用 refreshToken 获取新的 accessToken
   */
  tryRefreshToken(refreshToken) {
    wx.request({
      url: api.BASE_URL + 'refresh/',
      method: 'POST',
      data: { refresh_token: refreshToken },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          api.saveTokens(res.data.access_token, refreshToken);
          console.log('Token 刷新成功');
        } else {
          console.log('Token 刷新失败，需重新登录');
          api.clearTokens();
        }
      },
      fail: () => {
        console.log('Token 刷新请求失败');
      }
    });
  },

  /**
   * 全局数据
   */
  globalData: {
    userRole: '',       // 'student' | 'teacher'
    displayName: '',    // 用户显示名（真实姓名或用户名）
    username: '',       // 登录用户名
    baseURL: 'http://fe33969a.natappfree.cc/',
    aiDialogEnabled: false  // AI 对话悬浮窗是否启用
  },

  /**
   * 更新 TabBar（仅做最小操作，避免干扰原生选中态）
   */
  updateTabBar() {
    // 使用 wx.nextTick 确保 TabBar 已初始化
    wx.nextTick(() => {
      // 通过 setTabBarStyle 重设颜色确保样式正确
      wx.setTabBarStyle({
        color: '#999999',
        selectedColor: '#1677FF',
        backgroundColor: '#ffffff',
        borderStyle: 'black'
      });
    });
  }
});
